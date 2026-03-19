import { app, BrowserWindow, ipcMain, dialog, Menu, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { VaultManager } from './vault/vault-manager'
import { SessionManager } from './claude/session-manager'
import { loadState, saveState } from './state-store'
import type { AppState } from './state-store'
import type { NormalizedEvent, SessionStatus } from './claude/types'

let mainWindow: BrowserWindow | null = null
const vaultManager = new VaultManager()
const sessionManager = new SessionManager()
let appState: AppState = {}

function createWindow(): void {
  const bounds = appState.windowBounds
  mainWindow = new BrowserWindow({
    width: bounds?.width ?? 1400,
    height: bounds?.height ?? 900,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 800,
    minHeight: 600,
    title: 'Folio',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Forward renderer console to main process stdout
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const tag = ['LOG', 'WARN', 'ERR'][level] || 'LOG'
    console.log(`[Renderer:${tag}] ${message} (${sourceId}:${line})`)
  })

  // Open devtools in dev
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  // In dev, load from vite dev server
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Wire vault events to renderer
  vaultManager.onIndexComplete = (count) => {
    mainWindow?.webContents.send('folio:index-complete', count)
  }
  vaultManager.onFileChange = (event) => {
    mainWindow?.webContents.send('folio:file-change', event)
  }
  vaultManager.onIndexError = (error) => {
    mainWindow?.webContents.send('folio:index-error', error)
  }

  // Wire Claude events to renderer
  sessionManager.on('event', (event: NormalizedEvent) => {
    mainWindow?.webContents.send('folio:claude-event', event)
  })
  sessionManager.on('status-change', (status: SessionStatus, oldStatus: SessionStatus) => {
    mainWindow?.webContents.send('folio:claude-status', status, oldStatus)
  })
}

// --- Vault IPC Handlers ---

ipcMain.handle('folio:open-vault', async (_event, path: string) => {
  console.log('[IPC] open-vault:', path)
  try {
    await vaultManager.openVault(path)
    console.log('[IPC] open-vault success')
    return 0
  } catch (err) {
    console.error('[IPC] open-vault failed:', err)
    throw err
  }
})

ipcMain.handle('folio:read-note', async (_event, path: string) => {
  return vaultManager.readNote(path)
})

ipcMain.handle('folio:write-note', async (_event, path: string, content: string) => {
  vaultManager.writeNote(path, content)
})

ipcMain.handle('folio:list-directory', async (_event, path: string) => {
  console.log('[IPC] list-directory:', path)
  try {
    const result = vaultManager.listDirectory(path)
    console.log('[IPC] list-directory result:', result.length, 'entries')
    return result
  } catch (err) {
    console.error('[IPC] list-directory failed:', err)
    throw err
  }
})

ipcMain.handle('folio:search-notes', async (_event, query: string, limit?: number, offset?: number) => {
  return vaultManager.search(query, limit, offset)
})

ipcMain.handle('folio:get-backlinks', async (_event, noteName: string) => {
  return vaultManager.getBacklinks(noteName)
})

ipcMain.handle('folio:resolve-link', async (_event, target: string) => {
  return vaultManager.resolveLink(target)
})

ipcMain.handle('folio:resolve-asset', async (_event, assetPath: string) => {
  return vaultManager.resolveAsset(assetPath)
})

ipcMain.handle('folio:create-note', async (_event, path: string, noteType?: string) => {
  vaultManager.createNote(path, noteType)
})

ipcMain.handle('folio:rename-note', async (_event, oldPath: string, newPath: string) => {
  vaultManager.renameNote(oldPath, newPath)
})

ipcMain.handle('folio:delete-note', async (_event, path: string) => {
  vaultManager.deleteNote(path)
})

ipcMain.handle('folio:note-count', async () => {
  return vaultManager.noteCount()
})

ipcMain.handle('folio:select-directory', async () => {
  console.log('[IPC] select-directory called')
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Open Vault',
    })
    console.log('[IPC] select-directory result:', result)
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  } catch (err) {
    console.error('[IPC] select-directory failed:', err)
    throw err
  }
})

// --- State IPC Handlers ---

ipcMain.handle('folio:get-state', async () => {
  return appState
})

ipcMain.handle('folio:save-state', async (_event, partialState: Partial<AppState>) => {
  appState = { ...appState, ...partialState }
  saveState(appState)
})

// --- Claude IPC Handlers ---

ipcMain.handle('folio:claude-send', async (_event, requestId: string, prompt: string, projectPath?: string) => {
  const vaultPath = projectPath ?? vaultManager.getVaultPath()
  if (!vaultPath) {
    throw new Error('No vault open — open a vault first')
  }

  await sessionManager.sendPrompt(requestId, {
    prompt,
    projectPath: vaultPath,
    addDirs: [vaultPath],
  })
})

ipcMain.handle('folio:claude-cancel', async () => {
  return sessionManager.cancel()
})

ipcMain.handle('folio:claude-respond-permission', async (_event, questionId: string, decision: string) => {
  return sessionManager.respondToPermission(
    questionId,
    decision as 'allow' | 'deny' | 'allow-session'
  )
})

ipcMain.handle('folio:claude-status', async () => {
  return sessionManager.getStatusInfo()
})

ipcMain.handle('folio:claude-reset', async () => {
  sessionManager.resetSession()
})

// --- App lifecycle ---

// Register vault-asset:// protocol for serving images/files from the vault
protocol.registerSchemesAsPrivileged([
  { scheme: 'vault-asset', privileges: { bypassCSP: true, supportFetchAPI: true, stream: true } },
])

app.whenReady().then(async () => {
  appState = loadState()

  // Handle vault-asset:// requests → resolve to local files
  protocol.handle('vault-asset', (request) => {
    const assetPath = decodeURIComponent(request.url.replace('vault-asset://', ''))
    const resolved = vaultManager.resolveAsset(assetPath)
    if (resolved) {
      return net.fetch(pathToFileURL(resolved).href)
    }
    return new Response('Not found', { status: 404 })
  })

  // Explicit menu to prevent macOS Tahoe crash in _addWindowTabsMenuItemsIfNeeded
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  // Initialize permission server (non-blocking — window opens even if this fails)
  try {
    await sessionManager.initialize()
    console.log('[Main] Permission server initialized')
  } catch (err) {
    console.error('[Main] Permission server failed to start:', err)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Save window bounds
  if (mainWindow) {
    const bounds = mainWindow.getBounds()
    appState.windowBounds = bounds
    saveState(appState)
  }
  sessionManager.destroy()
  vaultManager.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

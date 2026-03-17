import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { VaultManager } from './vault/vault-manager'
import { SessionManager } from './claude/session-manager'
import type { NormalizedEvent, SessionStatus } from './claude/types'

let mainWindow: BrowserWindow | null = null
const vaultManager = new VaultManager()
const sessionManager = new SessionManager()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Folio',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

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
  await vaultManager.openVault(path)
  return 0
})

ipcMain.handle('folio:read-note', async (_event, path: string) => {
  return vaultManager.readNote(path)
})

ipcMain.handle('folio:write-note', async (_event, path: string, content: string) => {
  vaultManager.writeNote(path, content)
})

ipcMain.handle('folio:list-directory', async (_event, path: string) => {
  return vaultManager.listDirectory(path)
})

ipcMain.handle('folio:search-notes', async (_event, query: string) => {
  return vaultManager.search(query)
})

ipcMain.handle('folio:get-backlinks', async (_event, noteName: string) => {
  return vaultManager.getBacklinks(noteName)
})

ipcMain.handle('folio:create-note', async (_event, path: string, noteType?: string) => {
  vaultManager.createNote(path, noteType)
})

ipcMain.handle('folio:delete-note', async (_event, path: string) => {
  vaultManager.deleteNote(path)
})

ipcMain.handle('folio:note-count', async () => {
  return vaultManager.noteCount()
})

ipcMain.handle('folio:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Open Vault',
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
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

app.whenReady().then(async () => {
  // Initialize permission server before creating window
  await sessionManager.initialize()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  sessionManager.destroy()
  vaultManager.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

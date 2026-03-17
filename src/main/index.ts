import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { VaultManager } from './vault/vault-manager'

let mainWindow: BrowserWindow | null = null
const vaultManager = new VaultManager()

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
}

// --- IPC Handlers ---

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

// --- App lifecycle ---

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  vaultManager.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

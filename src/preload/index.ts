import { contextBridge, ipcRenderer } from 'electron'

export interface FolioAPI {
  vault: {
    openVault: (path: string) => Promise<void>
    readNote: (path: string) => Promise<string>
    writeNote: (path: string, content: string) => Promise<void>
    listDirectory: (path: string) => Promise<Array<{ name: string; path: string; is_directory: boolean }>>
    searchNotes: (query: string, limit?: number, offset?: number) => Promise<{
      results: Array<{
        path: string
        title: string | null
        note_type: string | null
        tags: string[]
        wikilinks: string[]
        modified: number
      }>
      total: number
    }>
    getBacklinks: (noteName: string) => Promise<string[]>
    resolveLink: (target: string) => Promise<string | null>
    resolveAsset: (assetPath: string) => Promise<string | null>
    createNote: (path: string, noteType?: string) => Promise<void>
    renameNote: (oldPath: string, newPath: string) => Promise<void>
    deleteNote: (path: string) => Promise<void>
    noteCount: () => Promise<number>
    selectDirectory: () => Promise<string | null>

    onIndexComplete: (callback: (count: number) => void) => () => void
    onFileChange: (callback: (event: { path: string; kind: string }) => void) => () => void
    onIndexError: (callback: (error: string) => void) => () => void

    getState: () => Promise<Record<string, unknown>>
    saveState: (state: Record<string, unknown>) => Promise<void>
  }

  claude: {
    sendPrompt: (requestId: string, prompt: string, projectPath?: string) => Promise<void>
    cancel: () => Promise<boolean>
    respondPermission: (questionId: string, decision: string) => Promise<boolean>
    getStatus: () => Promise<{
      status: string
      sessionId: string | null
      model: string | null
      lastResult: unknown | null
    }>
    resetSession: () => Promise<void>

    onEvent: (callback: (event: Record<string, unknown>) => void) => () => void
    onStatusChange: (callback: (status: string, oldStatus: string) => void) => () => void
  }
}

const api: FolioAPI = {
  vault: {
    openVault: (path) => ipcRenderer.invoke('folio:open-vault', path),
    readNote: (path) => ipcRenderer.invoke('folio:read-note', path),
    writeNote: (path, content) => ipcRenderer.invoke('folio:write-note', path, content),
    listDirectory: (path) => ipcRenderer.invoke('folio:list-directory', path),
    searchNotes: (query, limit?, offset?) => ipcRenderer.invoke('folio:search-notes', query, limit, offset),
    getBacklinks: (noteName) => ipcRenderer.invoke('folio:get-backlinks', noteName),
    resolveLink: (target) => ipcRenderer.invoke('folio:resolve-link', target),
    resolveAsset: (assetPath) => ipcRenderer.invoke('folio:resolve-asset', assetPath),
    createNote: (path, noteType) => ipcRenderer.invoke('folio:create-note', path, noteType),
    renameNote: (oldPath, newPath) => ipcRenderer.invoke('folio:rename-note', oldPath, newPath),
    deleteNote: (path) => ipcRenderer.invoke('folio:delete-note', path),
    noteCount: () => ipcRenderer.invoke('folio:note-count'),
    selectDirectory: () => ipcRenderer.invoke('folio:select-directory'),

    onIndexComplete: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, count: number) => callback(count)
      ipcRenderer.on('folio:index-complete', handler)
      return () => ipcRenderer.removeListener('folio:index-complete', handler)
    },

    onFileChange: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, event: { path: string; kind: string }) => callback(event)
      ipcRenderer.on('folio:file-change', handler)
      return () => ipcRenderer.removeListener('folio:file-change', handler)
    },

    onIndexError: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
      ipcRenderer.on('folio:index-error', handler)
      return () => ipcRenderer.removeListener('folio:index-error', handler)
    },

    getState: () => ipcRenderer.invoke('folio:get-state'),
    saveState: (state) => ipcRenderer.invoke('folio:save-state', state),
  },

  claude: {
    sendPrompt: (requestId, prompt, projectPath) =>
      ipcRenderer.invoke('folio:claude-send', requestId, prompt, projectPath),
    cancel: () =>
      ipcRenderer.invoke('folio:claude-cancel'),
    respondPermission: (questionId, decision) =>
      ipcRenderer.invoke('folio:claude-respond-permission', questionId, decision),
    getStatus: () =>
      ipcRenderer.invoke('folio:claude-status'),
    resetSession: () =>
      ipcRenderer.invoke('folio:claude-reset'),

    onEvent: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, event: Record<string, unknown>) => callback(event)
      ipcRenderer.on('folio:claude-event', handler)
      return () => ipcRenderer.removeListener('folio:claude-event', handler)
    },

    onStatusChange: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, status: string, oldStatus: string) => callback(status, oldStatus)
      ipcRenderer.on('folio:claude-status', handler)
      return () => ipcRenderer.removeListener('folio:claude-status', handler)
    },
  },
}

contextBridge.exposeInMainWorld('folio', api)

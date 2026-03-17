import { contextBridge, ipcRenderer } from 'electron'

export interface FolioAPI {
  vault: {
    openVault: (path: string) => Promise<void>
    readNote: (path: string) => Promise<string>
    writeNote: (path: string, content: string) => Promise<void>
    listDirectory: (path: string) => Promise<Array<{ name: string; path: string; is_directory: boolean }>>
    searchNotes: (query: string) => Promise<Array<{
      path: string
      title: string | null
      note_type: string | null
      tags: string[]
      wikilinks: string[]
      modified: number
    }>>
    getBacklinks: (noteName: string) => Promise<string[]>
    createNote: (path: string, noteType?: string) => Promise<void>
    deleteNote: (path: string) => Promise<void>
    noteCount: () => Promise<number>
    selectDirectory: () => Promise<string | null>

    // Events
    onIndexComplete: (callback: (count: number) => void) => () => void
    onFileChange: (callback: (event: { path: string; kind: string }) => void) => () => void
  }
}

const api: FolioAPI = {
  vault: {
    openVault: (path) => ipcRenderer.invoke('folio:open-vault', path),
    readNote: (path) => ipcRenderer.invoke('folio:read-note', path),
    writeNote: (path, content) => ipcRenderer.invoke('folio:write-note', path, content),
    listDirectory: (path) => ipcRenderer.invoke('folio:list-directory', path),
    searchNotes: (query) => ipcRenderer.invoke('folio:search-notes', query),
    getBacklinks: (noteName) => ipcRenderer.invoke('folio:get-backlinks', noteName),
    createNote: (path, noteType) => ipcRenderer.invoke('folio:create-note', path, noteType),
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
  },
}

contextBridge.exposeInMainWorld('folio', api)

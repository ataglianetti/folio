import { create } from 'zustand'
import type { FileEntry, NoteIndex } from '../types'
import { useToastStore } from './toast'

interface VaultState {
  // Vault state
  vaultPath: string | null
  isOpen: boolean
  noteCount: number
  indexError: string | null

  // File tree
  fileTree: FileEntry[]
  expandedPaths: Set<string>

  // Current note
  currentNotePath: string | null
  currentNoteContent: string | null
  isDirty: boolean

  // Search
  searchQuery: string
  searchResults: NoteIndex[]
  searchTotal: number

  // Actions
  openVault: (path: string) => Promise<void>
  loadDirectory: (path: string) => Promise<FileEntry[]>
  toggleDirectory: (path: string) => void
  openNote: (path: string) => Promise<void>
  saveNote: () => Promise<void>
  setContent: (content: string) => void
  search: (query: string) => Promise<void>
  searchAndOpen: (noteName: string) => Promise<void>
  createNote: (path: string, noteType?: string) => Promise<void>
  createAndOpen: () => Promise<void>
  renameNote: (oldPath: string, newPath: string) => Promise<void>
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vaultPath: null,
  isOpen: false,
  noteCount: 0,
  indexError: null,
  fileTree: [],
  expandedPaths: new Set<string>(),
  currentNotePath: null,
  currentNoteContent: null,
  isDirty: false,
  searchQuery: '',
  searchResults: [],
  searchTotal: 0,

  openVault: async (path: string) => {
    // Guard against double-open (StrictMode remounts)
    if (get().vaultPath === path && get().isOpen) return
    try {
      await window.folio.vault.openVault(path)
      const entries = await window.folio.vault.listDirectory('')
      set({
        vaultPath: path,
        isOpen: true,
        noteCount: 0,
        fileTree: entries as FileEntry[],
      })
    } catch (err) {
      useToastStore.getState().addToast('Failed to open vault')
      console.error('Failed to open vault:', err)
      throw err
    }
  },

  loadDirectory: async (dirPath: string) => {
    try {
      return (await window.folio.vault.listDirectory(dirPath)) as FileEntry[]
    } catch (err) {
      console.error('Failed to load directory:', err)
      return []
    }
  },

  toggleDirectory: (path: string) => {
    const { expandedPaths } = get()
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    set({ expandedPaths: newExpanded })
  },

  openNote: async (path: string) => {
    try {
      const { isDirty } = get()
      if (isDirty) {
        await get().saveNote()
      }

      const content = await window.folio.vault.readNote(path)
      set({
        currentNotePath: path,
        currentNoteContent: content,
        isDirty: false,
      })
    } catch (err) {
      useToastStore.getState().addToast('Failed to open note')
      console.error('Failed to open note:', err)
    }
  },

  saveNote: async () => {
    const { currentNotePath, currentNoteContent } = get()
    if (!currentNotePath || currentNoteContent === null) return

    try {
      await window.folio.vault.writeNote(currentNotePath, currentNoteContent)
      set({ isDirty: false })
    } catch (err) {
      useToastStore.getState().addToast('Failed to save note')
      console.error('Failed to save note:', err)
    }
  },

  setContent: (content: string) => {
    set({ currentNoteContent: content, isDirty: true })
  },

  search: async (query: string) => {
    set({ searchQuery: query })
    if (!query.trim()) {
      set({ searchResults: [], searchTotal: 0 })
      return
    }
    try {
      const { results, total } = await window.folio.vault.searchNotes(query)
      set({ searchResults: results, searchTotal: total })
    } catch (err) {
      console.error('Search failed:', err)
      set({ searchResults: [], searchTotal: 0 })
    }
  },

  searchAndOpen: async (noteName: string) => {
    try {
      // Use shortest-path resolution (matches Obsidian's algorithm)
      const resolved = await window.folio.vault.resolveLink(noteName)
      if (resolved) {
        await get().openNote(resolved)
        return
      }
      // Fallback to search if resolve fails
      const { results } = await window.folio.vault.searchNotes(noteName)
      if (results[0]) {
        await get().openNote(results[0].path)
      }
    } catch (err) {
      console.error('Failed to search and open:', err)
    }
  },

  createNote: async (path: string, noteType?: string) => {
    try {
      await window.folio.vault.createNote(path, noteType)
      await get().openNote(path)
    } catch (err) {
      useToastStore.getState().addToast('Failed to create note')
      console.error('Failed to create note:', err)
    }
  },

  createAndOpen: async () => {
    const timestamp = Date.now()
    const path = `Untitled-${timestamp}.md`
    try {
      await window.folio.vault.createNote(path)
      await get().openNote(path)
      // Refresh file tree
      const entries = await window.folio.vault.listDirectory('')
      set({ fileTree: entries as FileEntry[] })
    } catch (err) {
      useToastStore.getState().addToast('Failed to create note')
      console.error('Failed to create note:', err)
    }
  },

  renameNote: async (oldPath: string, newPath: string) => {
    try {
      await window.folio.vault.renameNote(oldPath, newPath)
      const { currentNotePath } = get()
      if (currentNotePath === oldPath) {
        set({ currentNotePath: newPath })
      }
      // Refresh file tree
      const entries = await window.folio.vault.listDirectory('')
      set({ fileTree: entries as FileEntry[] })
    } catch (err) {
      useToastStore.getState().addToast('Failed to rename note')
      console.error('Failed to rename note:', err)
    }
  },
}))

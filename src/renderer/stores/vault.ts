import { create } from 'zustand'
import type { FileEntry, NoteIndex } from '../types'

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

  openVault: async (path: string) => {
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
      console.error('Failed to save note:', err)
    }
  },

  setContent: (content: string) => {
    set({ currentNoteContent: content, isDirty: true })
  },

  search: async (query: string) => {
    set({ searchQuery: query })
    if (!query.trim()) {
      set({ searchResults: [] })
      return
    }
    try {
      const results = await window.folio.vault.searchNotes(query)
      set({ searchResults: results })
    } catch (err) {
      console.error('Search failed:', err)
      set({ searchResults: [] })
    }
  },

  searchAndOpen: async (noteName: string) => {
    try {
      const results = await window.folio.vault.searchNotes(noteName)
      const exactMatch = results.find((r) => {
        const filename = r.path.split('/').pop()?.replace('.md', '') ?? ''
        return filename.toLowerCase() === noteName.toLowerCase()
      })
      const titleMatch = results.find((r) =>
        r.title?.toLowerCase() === noteName.toLowerCase()
      )
      const match = exactMatch || titleMatch || results[0]
      if (match) {
        await get().openNote(match.path)
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
      console.error('Failed to create note:', err)
    }
  },
}))

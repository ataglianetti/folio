import { create } from 'zustand'

type SidebarPanel = 'files' | 'search' | 'properties'

interface UIState {
  sidebarPanel: SidebarPanel
  sidebarWidth: number
  showCommandPalette: boolean
  theme: 'light' | 'dark' | 'system'
  chatOpen: boolean
  chatWidth: number

  setSidebarPanel: (panel: SidebarPanel) => void
  setSidebarWidth: (width: number) => void
  toggleCommandPalette: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleChat: () => void
  setChatWidth: (width: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarPanel: 'files',
  sidebarWidth: 260,
  showCommandPalette: false,
  theme: 'system',
  chatOpen: false,
  chatWidth: 400,

  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  toggleCommandPalette: () =>
    set((state) => ({ showCommandPalette: !state.showCommandPalette })),
  setTheme: (theme) => set({ theme }),
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  setChatWidth: (width) => set({ chatWidth: width }),
}))

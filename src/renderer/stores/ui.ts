import { create } from 'zustand'
import { applyTheme } from '../theme'

type SidebarPanel = 'files' | 'search' | 'properties'
type ThemeMode = 'light' | 'dark' | 'system'

interface UIState {
  sidebarPanel: SidebarPanel
  sidebarWidth: number
  showCommandPalette: boolean
  themeMode: ThemeMode
  isDark: boolean
  chatOpen: boolean
  chatWidth: number

  setSidebarPanel: (panel: SidebarPanel) => void
  setSidebarWidth: (width: number) => void
  toggleCommandPalette: () => void
  setThemeMode: (mode: ThemeMode) => void
  setSystemDark: (isDark: boolean) => void
  toggleChat: () => void
  setChatWidth: (width: number) => void
}

function resolveIsDark(mode: ThemeMode, systemIsDark: boolean): boolean {
  if (mode === 'system') return systemIsDark
  return mode === 'dark'
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarPanel: 'files',
  sidebarWidth: 260,
  showCommandPalette: false,
  themeMode: 'system',
  isDark: true, // Default dark
  chatOpen: true,
  chatWidth: 400,

  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  toggleCommandPalette: () =>
    set((state) => ({ showCommandPalette: !state.showCommandPalette })),

  setThemeMode: (mode) => {
    const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = resolveIsDark(mode, systemIsDark)
    applyTheme(isDark)
    set({ themeMode: mode, isDark })
  },

  setSystemDark: (systemIsDark) => {
    const { themeMode } = get()
    if (themeMode === 'system') {
      applyTheme(systemIsDark)
      set({ isDark: systemIsDark })
    }
  },

  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  setChatWidth: (width) => set({ chatWidth: width }),
}))

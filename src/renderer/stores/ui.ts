import { create } from 'zustand'
import { applyTheme } from '../theme'

type SidebarPanel = 'files' | 'search'
type ThemeMode = 'light' | 'dark' | 'system'

interface UIState {
  sidebarPanel: SidebarPanel
  sidebarWidth: number
  sidebarVisible: boolean
  showCommandPalette: boolean
  themeMode: ThemeMode
  isDark: boolean
  chatOpen: boolean
  chatWidth: number
  propertiesOpen: boolean
  propertiesWidth: number

  setSidebarPanel: (panel: SidebarPanel) => void
  setSidebarWidth: (width: number) => void
  toggleSidebar: () => void
  toggleCommandPalette: () => void
  setThemeMode: (mode: ThemeMode) => void
  setSystemDark: (isDark: boolean) => void
  toggleChat: () => void
  setChatWidth: (width: number) => void
  toggleProperties: () => void
  setPropertiesWidth: (width: number) => void
}

function resolveIsDark(mode: ThemeMode, systemIsDark: boolean): boolean {
  if (mode === 'system') return systemIsDark
  return mode === 'dark'
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarPanel: 'files',
  sidebarWidth: 260,
  sidebarVisible: true,
  showCommandPalette: false,
  themeMode: 'dark',
  isDark: true,
  chatOpen: true,
  chatWidth: 400,
  propertiesOpen: true,
  propertiesWidth: 280,

  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
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
  toggleProperties: () => set((s) => ({ propertiesOpen: !s.propertiesOpen })),
  setPropertiesWidth: (width) => set({ propertiesWidth: width }),
}))

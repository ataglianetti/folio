/**
 * Folio design token system.
 * JS token objects synced to CSS custom properties.
 * Dark-first, warm earth tones.
 */

export interface ColorPalette {
  // Backgrounds
  bgApp: string
  bgSidebar: string
  bgSurface: string
  bgInput: string
  bgHover: string
  bgActive: string
  bgCode: string

  // Text
  textPrimary: string
  textSecondary: string
  textMuted: string

  // Borders
  border: string
  borderSubtle: string

  // Accent
  accent: string
  accentSoft: string

  // Selection
  selection: string

  // Status
  success: string
  error: string
  warning: string
}

export const darkPalette: ColorPalette = {
  bgApp: '#1a1a18',
  bgSidebar: '#161614',
  bgSurface: '#242422',
  bgInput: '#2a2a27',
  bgHover: '#353530',
  bgActive: 'rgba(217, 119, 87, 0.1)',
  bgCode: '#2a2a27',

  textPrimary: '#ccc9c0',
  textSecondary: '#8a8a80',
  textMuted: '#555550',

  border: '#3b3b36',
  borderSubtle: '#2d2d28',

  accent: '#d97757',
  accentSoft: 'rgba(217, 119, 87, 0.15)',

  selection: 'rgba(217, 119, 87, 0.2)',

  success: '#7aac8c',
  error: '#c47060',
  warning: '#f59e0b',
}

export const lightPalette: ColorPalette = {
  bgApp: '#faf9f6',
  bgSidebar: '#f5f4f0',
  bgSurface: '#ffffff',
  bgInput: '#f0efe8',
  bgHover: 'rgba(0, 0, 0, 0.04)',
  bgActive: 'rgba(217, 119, 87, 0.08)',
  bgCode: '#f0efe8',

  textPrimary: '#1a1a1a',
  textSecondary: '#555555',
  textMuted: '#a0a09a',

  border: '#e5e4de',
  borderSubtle: '#eeede8',

  accent: '#d97757',
  accentSoft: 'rgba(217, 119, 87, 0.1)',

  selection: 'rgba(217, 119, 87, 0.12)',

  success: '#5a9468',
  error: '#c45040',
  warning: '#d97706',
}

/**
 * Sync token object to CSS custom properties on :root.
 * Converts camelCase keys to --folio-kebab-case.
 */
export function syncTokensToCss(tokens: ColorPalette): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(tokens)) {
    const cssVar = '--' + camelToKebab(key)
    root.style.setProperty(cssVar, value)
  }
}

/**
 * Apply theme by setting CSS variables and class.
 */
export function applyTheme(isDark: boolean): void {
  const tokens = isDark ? darkPalette : lightPalette
  const root = document.documentElement

  // Set semantic CSS vars used by components
  root.style.setProperty('--bg-primary', tokens.bgApp)
  root.style.setProperty('--bg-sidebar', tokens.bgSidebar)
  root.style.setProperty('--bg-surface', tokens.bgSurface)
  root.style.setProperty('--bg-input', tokens.bgInput)
  root.style.setProperty('--bg-hover', tokens.bgHover)
  root.style.setProperty('--bg-active', tokens.bgActive)
  root.style.setProperty('--bg-code', tokens.bgCode)

  root.style.setProperty('--text-primary', tokens.textPrimary)
  root.style.setProperty('--text-secondary', tokens.textSecondary)
  root.style.setProperty('--text-muted', tokens.textMuted)

  root.style.setProperty('--border', tokens.border)
  root.style.setProperty('--border-subtle', tokens.borderSubtle)

  root.style.setProperty('--accent', tokens.accent)
  root.style.setProperty('--accent-soft', tokens.accentSoft)

  root.style.setProperty('--selection', tokens.selection)

  root.style.setProperty('--success', tokens.success)
  root.style.setProperty('--error', tokens.error)
  root.style.setProperty('--warning', tokens.warning)

  // Toggle class for dark mode
  root.classList.toggle('dark', isDark)

  // Also sync full token set
  syncTokensToCss(tokens)
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
}

/**
 * Detect system preference and apply.
 * Returns cleanup function.
 */
export function watchSystemTheme(onThemeChange: (isDark: boolean) => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => onThemeChange(e.matches)
  mq.addEventListener('change', handler)

  // Apply initial
  onThemeChange(mq.matches)

  return () => mq.removeEventListener('change', handler)
}

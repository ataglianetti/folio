/**
 * Folio design token system — matched to clui-cc palette.
 */

export interface ColorPalette {
  // Container & glass
  containerBg: string
  containerBorder: string
  containerShadow: string
  cardShadow: string

  // Surfaces
  surfacePrimary: string
  surfaceSecondary: string
  surfaceHover: string
  surfaceActive: string

  // Text
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textMuted: string

  // Accent
  accent: string
  accentLight: string
  accentSoft: string
  accentBorder: string

  // Input
  inputBg: string
  inputBorder: string
  inputFocusBorder: string
  inputPillBg: string

  // Status
  statusRunning: string
  statusRunningBg: string
  statusComplete: string
  statusCompleteBg: string
  statusError: string
  statusErrorBg: string
  statusPermission: string

  // User message
  userBubble: string
  userBubbleBorder: string
  userBubbleText: string

  // Tool
  toolBg: string
  toolBorder: string
  toolRunningBorder: string
  toolRunningBg: string

  // Code
  codeBg: string
  placeholder: string

  // Buttons
  sendBg: string
  sendHover: string
  sendDisabled: string
  stopBg: string
  stopHover: string
  btnHoverColor: string
  btnHoverBg: string

  // Permission
  permissionBorder: string
  permissionShadow: string
  permissionHeaderBg: string
  permissionHeaderBorder: string
  permissionAllowBg: string
  permissionAllowHoverBg: string
  permissionAllowBorder: string
  permissionDenyBg: string
  permissionDenyHoverBg: string
  permissionDenyBorder: string

  // Scrollbar
  scrollThumb: string
  scrollThumbHover: string

  // Popover
  popoverBg: string
  popoverBorder: string
  popoverShadow: string
}

export const darkPalette: ColorPalette = {
  containerBg: '#242422',
  containerBorder: '#3b3b36',
  containerShadow: '0 8px 28px rgba(0,0,0,0.35), 0 1px 6px rgba(0,0,0,0.25)',
  cardShadow: '0 2px 8px rgba(0,0,0,0.35)',

  surfacePrimary: '#353530',
  surfaceSecondary: '#42423d',
  surfaceHover: 'rgba(255,255,255,0.05)',
  surfaceActive: 'rgba(255,255,255,0.08)',

  textPrimary: '#ccc9c0',
  textSecondary: '#c0bdb2',
  textTertiary: '#76766e',
  textMuted: '#353530',

  accent: '#d97757',
  accentLight: 'rgba(217,119,87,0.1)',
  accentSoft: 'rgba(217,119,87,0.15)',
  accentBorder: 'rgba(217,119,87,0.19)',

  inputBg: 'transparent',
  inputBorder: '#3b3b36',
  inputFocusBorder: 'rgba(217,119,87,0.4)',
  inputPillBg: '#2a2a27',

  statusRunning: '#d97757',
  statusRunningBg: 'rgba(217,119,87,0.1)',
  statusComplete: '#7aac8c',
  statusCompleteBg: 'rgba(122,172,140,0.1)',
  statusError: '#c47060',
  statusErrorBg: 'rgba(196,112,96,0.08)',
  statusPermission: '#d97757',

  userBubble: '#353530',
  userBubbleBorder: '#4a4a45',
  userBubbleText: '#ccc9c0',

  toolBg: '#353530',
  toolBorder: '#4a4a45',
  toolRunningBorder: 'rgba(217,119,87,0.3)',
  toolRunningBg: 'rgba(217,119,87,0.05)',

  codeBg: '#1a1a18',
  placeholder: '#6b6b60',

  sendBg: '#d97757',
  sendHover: '#c96442',
  sendDisabled: 'rgba(217,119,87,0.3)',
  stopBg: '#ef4444',
  stopHover: '#dc2626',
  btnHoverColor: '#c0bdb2',
  btnHoverBg: '#302f2d',

  permissionBorder: 'rgba(245,158,11,0.3)',
  permissionShadow: '0 2px 12px rgba(245,158,11,0.08)',
  permissionHeaderBg: 'rgba(245,158,11,0.06)',
  permissionHeaderBorder: 'rgba(245,158,11,0.12)',
  permissionAllowBg: 'rgba(34,197,94,0.1)',
  permissionAllowHoverBg: 'rgba(34,197,94,0.22)',
  permissionAllowBorder: 'rgba(34,197,94,0.25)',
  permissionDenyBg: 'rgba(239,68,68,0.08)',
  permissionDenyHoverBg: 'rgba(239,68,68,0.18)',
  permissionDenyBorder: 'rgba(239,68,68,0.22)',

  scrollThumb: 'rgba(255,255,255,0.15)',
  scrollThumbHover: 'rgba(255,255,255,0.25)',

  popoverBg: '#292927',
  popoverBorder: '#3b3b36',
  popoverShadow: '0 4px 20px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)',
}

export const lightPalette: ColorPalette = {
  containerBg: '#f9f8f5',
  containerBorder: '#e5e2d9',
  containerShadow: '0 8px 28px rgba(0,0,0,0.08), 0 1px 6px rgba(0,0,0,0.05)',
  cardShadow: '0 2px 8px rgba(0,0,0,0.08)',

  surfacePrimary: '#f4f2ed',
  surfaceSecondary: '#edeae0',
  surfaceHover: 'rgba(0,0,0,0.03)',
  surfaceActive: 'rgba(0,0,0,0.06)',

  textPrimary: '#3c3929',
  textSecondary: '#5a5749',
  textTertiary: '#8a8a80',
  textMuted: '#dddad2',

  accent: '#d97757',
  accentLight: 'rgba(217,119,87,0.1)',
  accentSoft: 'rgba(217,119,87,0.15)',
  accentBorder: 'rgba(217,119,87,0.19)',

  inputBg: 'transparent',
  inputBorder: '#e5e2d9',
  inputFocusBorder: 'rgba(217,119,87,0.4)',
  inputPillBg: '#f0efe8',

  statusRunning: '#d97757',
  statusRunningBg: 'rgba(217,119,87,0.1)',
  statusComplete: '#5a9e6f',
  statusCompleteBg: 'rgba(90,158,111,0.1)',
  statusError: '#c45040',
  statusErrorBg: 'rgba(196,80,64,0.06)',
  statusPermission: '#d97757',

  userBubble: '#f0efe8',
  userBubbleBorder: '#e5e2d9',
  userBubbleText: '#3c3929',

  toolBg: '#f4f2ed',
  toolBorder: '#e5e2d9',
  toolRunningBorder: 'rgba(217,119,87,0.3)',
  toolRunningBg: 'rgba(217,119,87,0.05)',

  codeBg: '#f0efe8',
  placeholder: '#a0a098',

  sendBg: '#d97757',
  sendHover: '#c96442',
  sendDisabled: 'rgba(217,119,87,0.3)',
  stopBg: '#ef4444',
  stopHover: '#dc2626',
  btnHoverColor: '#5a5749',
  btnHoverBg: '#edeae0',

  permissionBorder: 'rgba(245,158,11,0.3)',
  permissionShadow: '0 2px 12px rgba(245,158,11,0.08)',
  permissionHeaderBg: 'rgba(245,158,11,0.06)',
  permissionHeaderBorder: 'rgba(245,158,11,0.12)',
  permissionAllowBg: 'rgba(34,197,94,0.1)',
  permissionAllowHoverBg: 'rgba(34,197,94,0.22)',
  permissionAllowBorder: 'rgba(34,197,94,0.25)',
  permissionDenyBg: 'rgba(239,68,68,0.08)',
  permissionDenyHoverBg: 'rgba(239,68,68,0.18)',
  permissionDenyBorder: 'rgba(239,68,68,0.22)',

  scrollThumb: 'rgba(0,0,0,0.12)',
  scrollThumbHover: 'rgba(0,0,0,0.2)',

  popoverBg: '#ffffff',
  popoverBorder: '#e5e2d9',
  popoverShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
}

/** Convert camelCase token name to kebab-case CSS custom property */
function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

/** Sync all palette tokens to CSS custom properties on :root */
function syncTokensToCss(tokens: ColorPalette): void {
  const s = document.documentElement.style
  for (const [key, value] of Object.entries(tokens)) {
    s.setProperty(`--${camelToKebab(key)}`, value)
  }
}

/** Apply palette to CSS custom properties */
export function applyTheme(isDark: boolean): void {
  const t = isDark ? darkPalette : lightPalette
  const s = document.documentElement.style

  // Auto-sync all palette tokens as --kebab-case vars
  syncTokensToCss(t)

  // Legacy aliases — existing components reference these var names.
  // Migrate components to the canonical names over time, then remove these.
  s.setProperty('--bg-primary', isDark ? '#1a1a18' : '#faf9f6')
  s.setProperty('--bg-sidebar', isDark ? '#1e1e1c' : '#f5f4f0')
  s.setProperty('--bg-surface', t.containerBg)
  s.setProperty('--bg-input', t.inputPillBg)
  s.setProperty('--bg-hover', t.surfaceHover)
  s.setProperty('--bg-active', t.surfaceActive)
  s.setProperty('--bg-code', t.codeBg)
  s.setProperty('--text-muted', t.textTertiary)
  s.setProperty('--border', t.containerBorder)
  s.setProperty('--border-subtle', isDark ? '#2d2d28' : '#eeede8')
  s.setProperty('--accent', t.accent)
  s.setProperty('--accent-light', t.accentLight)
  s.setProperty('--accent-soft', t.accentSoft)
  s.setProperty('--selection', isDark ? 'rgba(217,119,87,0.2)' : 'rgba(217,119,87,0.12)')
  s.setProperty('--success', t.statusComplete)
  s.setProperty('--error', t.statusError)
  s.setProperty('--warning', t.statusPermission)

  document.documentElement.classList.toggle('dark', isDark)
}

export function watchSystemTheme(onThemeChange: (isDark: boolean) => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => onThemeChange(e.matches)
  mq.addEventListener('change', handler)
  onThemeChange(mq.matches)
  return () => mq.removeEventListener('change', handler)
}

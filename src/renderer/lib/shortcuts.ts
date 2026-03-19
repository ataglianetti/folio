type ShortcutHandler = () => void

interface Shortcut {
  key: string        // normalized: "Mod+S", "Mod+Shift+L"
  label: string      // human-readable action name
  handler: ShortcutHandler
}

const registry = new Map<string, Shortcut>()

/** Register a keyboard shortcut. Overwrites if key already registered. */
export function registerShortcut(key: string, label: string, handler: ShortcutHandler): void {
  registry.set(key, { key, label, handler })
}

/** Remove a shortcut by key. */
export function unregisterShortcut(key: string): void {
  registry.delete(key)
}

/** Get all registered shortcuts (for command palette hints). */
export function getShortcuts(): Shortcut[] {
  return Array.from(registry.values())
}

/** Format a shortcut key for display (Mod → ⌘/Ctrl). */
export function formatShortcut(key: string): string {
  const isMac = navigator.platform.includes('Mac')
  return key
    .replace(/Mod/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Shift/g, isMac ? '⇧' : 'Shift')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/\+/g, '')
}

/** Normalize a KeyboardEvent into our key string format. */
function normalizeEvent(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('Mod')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')

  // Normalize the key
  let key = e.key
  if (key.length === 1) key = key.toUpperCase()

  parts.push(key)
  return parts.join('+')
}

let listening = false

/** Attach the global keydown listener. Call once at app init. */
export function initGlobalListener(): () => void {
  if (listening) return () => {}

  const handler = (e: KeyboardEvent) => {
    // Don't intercept when typing in inputs (unless it's a Mod combo)
    if (!(e.metaKey || e.ctrlKey) && isEditable(e.target as Element)) return

    const normalized = normalizeEvent(e)
    const shortcut = registry.get(normalized)
    if (shortcut) {
      e.preventDefault()
      shortcut.handler()
    }
  }

  document.addEventListener('keydown', handler)
  listening = true

  return () => {
    document.removeEventListener('keydown', handler)
    listening = false
  }
}

function isEditable(el: Element): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

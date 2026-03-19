import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

export interface AppState {
  windowBounds?: { x: number; y: number; width: number; height: number }
  lastVaultPath?: string
  lastNotePath?: string
  sidebarWidth?: number
  chatWidth?: number
  propertiesWidth?: number
  chatOpen?: boolean
  propertiesOpen?: boolean
  sidebarVisible?: boolean
}

const STATE_FILE = join(app.getPath('userData'), 'folio-state.json')

export function loadState(): AppState {
  try {
    const raw = readFileSync(STATE_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveState(state: AppState): void {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true })
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    console.error('[StateStore] Failed to save state:', err)
  }
}

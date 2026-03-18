import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, statSync, realpathSync } from 'fs'
import { join, relative, extname, dirname, resolve, isAbsolute } from 'path'
import { Indexer } from './indexer'
import { FileWatcher } from './file-watcher'
import type { FileChangeEvent } from './file-watcher'

export interface FileEntry {
  name: string
  path: string
  is_directory: boolean
}

export class VaultManager {
  private vaultPath: string | null = null
  private indexer: Indexer | null = null
  private watcher: FileWatcher

  // Callback for when indexing completes
  onIndexComplete: ((count: number) => void) | null = null
  // Callback for file changes
  onFileChange: ((event: FileChangeEvent) => void) | null = null
  // Callback for indexing errors
  onIndexError: ((error: string) => void) | null = null

  constructor() {
    this.watcher = new FileWatcher()
    this.watcher.on('file-change', (event: FileChangeEvent) => {
      this.onFileChange?.(event)
    })
  }

  async openVault(path: string): Promise<void> {
    // Validate path
    const stat = statSync(path)
    if (!stat.isDirectory()) {
      throw new Error('Path is not a directory')
    }

    this.vaultPath = path
    this.indexer = new Indexer(path)

    // Start file watching
    this.watcher.start(path, this.indexer)

    // Background indexing
    setImmediate(() => {
      try {
        const count = this.indexer!.fullIndex(path)
        this.onIndexComplete?.(count)
      } catch (err) {
        console.error('Full index failed:', err)
        this.onIndexError?.(err instanceof Error ? err.message : String(err))
      }
    })
  }

  readNote(notePath: string): string {
    const fullPath = this.safePath(notePath)
    return readFileSync(fullPath, 'utf-8')
  }

  writeNote(notePath: string, content: string): void {
    const fullPath = this.safePath(notePath)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')

    // Re-index
    this.indexer!.indexFile(this.vaultPath!, fullPath)
  }

  listDirectory(dirPath: string): FileEntry[] {
    const fullPath = dirPath ? this.safePath(dirPath) : this.vaultPath!
    if (!dirPath) this.ensureVault()

    const entries = readdirSync(fullPath, { withFileTypes: true })
    const result: FileEntry[] = []

    for (const entry of entries) {
      // Skip hidden files/dirs
      if (entry.name.startsWith('.')) continue

      const entryRelPath = dirPath
        ? `${dirPath}/${entry.name}`
        : entry.name

      result.push({
        name: entry.name,
        path: entryRelPath,
        is_directory: entry.isDirectory(),
      })
    }

    // Sort: directories first, then alphabetical
    result.sort((a, b) => {
      if (a.is_directory !== b.is_directory) {
        return a.is_directory ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return result
  }

  createNote(notePath: string, noteType?: string): void {
    const fullPath = this.safePath(notePath)
    mkdirSync(dirname(fullPath), { recursive: true })

    let content = ''
    if (noteType) {
      const date = new Date().toISOString().split('T')[0]
      content = `---\ntype: ${noteType}\ncreated: ${date}\n---\n\n`
    }

    writeFileSync(fullPath, content, 'utf-8')
    this.indexer!.indexFile(this.vaultPath!, fullPath)
  }

  deleteNote(notePath: string): void {
    const fullPath = this.safePath(notePath)
    unlinkSync(fullPath)
    this.indexer!.removeFile(this.vaultPath!, fullPath)
  }

  search(query: string) {
    this.ensureVault()
    return this.indexer!.search(query)
  }

  getBacklinks(noteName: string) {
    this.ensureVault()
    return this.indexer!.backlinks(noteName)
  }

  noteCount(): number {
    if (!this.indexer) return 0
    return this.indexer.noteCount()
  }

  getVaultPath(): string | null {
    return this.vaultPath
  }

  close(): void {
    this.watcher.stop()
    this.indexer?.close()
    this.indexer = null
    this.vaultPath = null
  }

  /**
   * Resolve a relative note path to an absolute path within the vault.
   * Throws if the resolved path escapes vault bounds.
   */
  private safePath(notePath: string): string {
    this.ensureVault()

    // Reject absolute paths outright
    if (isAbsolute(notePath)) {
      throw new Error('Absolute paths are not allowed')
    }

    const resolved = resolve(this.vaultPath!, notePath)

    // Check that resolved path is within vault root.
    // Use realpathSync where possible (follows symlinks), fall back to resolve
    // for paths that don't exist yet (e.g. createNote).
    let canonical: string
    try {
      canonical = realpathSync(resolved)
    } catch {
      canonical = resolved
    }

    let vaultCanonical: string
    try {
      vaultCanonical = realpathSync(this.vaultPath!)
    } catch {
      vaultCanonical = this.vaultPath!
    }

    if (!canonical.startsWith(vaultCanonical + '/') && canonical !== vaultCanonical) {
      throw new Error('Path escapes vault bounds')
    }

    return resolved
  }

  private ensureVault(): void {
    if (!this.vaultPath || !this.indexer) {
      throw new Error('No vault open')
    }
  }
}

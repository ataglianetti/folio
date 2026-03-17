import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, statSync } from 'fs'
import { join, relative, extname, dirname } from 'path'
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
      }
    })
  }

  readNote(notePath: string): string {
    this.ensureVault()
    const fullPath = join(this.vaultPath!, notePath)
    return readFileSync(fullPath, 'utf-8')
  }

  writeNote(notePath: string, content: string): void {
    this.ensureVault()
    const fullPath = join(this.vaultPath!, notePath)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')

    // Re-index
    this.indexer!.indexFile(this.vaultPath!, fullPath)
  }

  listDirectory(dirPath: string): FileEntry[] {
    this.ensureVault()
    const fullPath = dirPath ? join(this.vaultPath!, dirPath) : this.vaultPath!

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
    this.ensureVault()
    const fullPath = join(this.vaultPath!, notePath)
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
    this.ensureVault()
    const fullPath = join(this.vaultPath!, notePath)
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

  private ensureVault(): void {
    if (!this.vaultPath || !this.indexer) {
      throw new Error('No vault open')
    }
  }
}

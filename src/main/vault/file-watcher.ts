import { watch } from 'chokidar'
import { extname } from 'path'
import { EventEmitter } from 'events'
import type { FSWatcher } from 'chokidar'
import type { Indexer } from './indexer'

export interface FileChangeEvent {
  path: string
  kind: 'add' | 'change' | 'unlink'
}

export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null

  start(vaultPath: string, indexer: Indexer): void {
    this.stop()

    this.watcher = watch(vaultPath, {
      ignored: /(^|[/\\])\./,  // Ignore hidden files/dirs
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    })

    this.watcher.on('add', (filePath) => {
      if (extname(filePath) !== '.md') return
      try {
        indexer.indexFile(vaultPath, filePath)
        this.emit('file-change', { path: filePath, kind: 'add' } satisfies FileChangeEvent)
      } catch (err) {
        console.error('Watch index error (add):', err)
      }
    })

    this.watcher.on('change', (filePath) => {
      if (extname(filePath) !== '.md') return
      try {
        indexer.indexFile(vaultPath, filePath)
        this.emit('file-change', { path: filePath, kind: 'change' } satisfies FileChangeEvent)
      } catch (err) {
        console.error('Watch index error (change):', err)
      }
    })

    this.watcher.on('unlink', (filePath) => {
      if (extname(filePath) !== '.md') return
      try {
        indexer.removeFile(vaultPath, filePath)
        this.emit('file-change', { path: filePath, kind: 'unlink' } satisfies FileChangeEvent)
      } catch (err) {
        console.error('Watch index error (unlink):', err)
      }
    })
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}

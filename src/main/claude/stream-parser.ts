import { EventEmitter } from 'events'
import type { Readable } from 'stream'
import type { ClaudeEvent } from './types'

/**
 * Incremental NDJSON parser for Claude's stream-json output.
 * Buffers partial lines across chunks, emits parsed JSON objects.
 */
export class StreamParser extends EventEmitter {
  private buffer = ''

  /** Feed a chunk of data. May emit multiple 'event' events. */
  feed(chunk: string): void {
    this.buffer += chunk
    const lines = this.buffer.split('\n')

    // Keep the last (potentially incomplete) line in the buffer
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const parsed = JSON.parse(trimmed) as ClaudeEvent
        this.emit('event', parsed)
      } catch {
        this.emit('parse-error', trimmed)
      }
    }
  }

  /** Flush remaining buffer at stream end. */
  flush(): void {
    const trimmed = this.buffer.trim()
    if (!trimmed) return

    try {
      const parsed = JSON.parse(trimmed) as ClaudeEvent
      this.emit('event', parsed)
    } catch {
      this.emit('parse-error', trimmed)
    }

    this.buffer = ''
  }

  /** Attach to a readable stream. */
  static fromStream(readable: Readable): StreamParser {
    const parser = new StreamParser()
    readable.setEncoding('utf-8')
    readable.on('data', (chunk: string) => parser.feed(chunk))
    readable.on('end', () => parser.flush())
    return parser
  }
}

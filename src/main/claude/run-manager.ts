import { spawn } from 'child_process'
import type { ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { existsSync } from 'fs'
import { StreamParser } from './stream-parser'
import { normalizeEvent } from './event-normalizer'
import type { NormalizedEvent, RunOptions, EnrichedError, ClaudeEvent } from './types'

const MAX_RING_LINES = 100

const SAFE_TOOLS = [
  'Read', 'Glob', 'Grep', 'LS',
  'TodoRead', 'TodoWrite',
  'Agent', 'Task', 'TaskOutput', 'Notebook',
  'WebSearch', 'WebFetch',
]

const DEFAULT_ALLOWED_TOOLS = [
  'Bash', 'Edit', 'Write', 'MultiEdit',
  ...SAFE_TOOLS,
]

/** Find the claude binary. */
function findClaudeBinary(): string {
  const candidates = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${process.env.HOME}/.npm-global/bin/claude`,
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return 'claude' // Fall back to PATH
}

/**
 * Manages a single Claude subprocess run.
 * Spawns `claude -p`, parses NDJSON, emits normalized events.
 */
export class RunManager extends EventEmitter {
  private process: ChildProcess | null = null
  private stderrTail: string[] = []
  private stdoutTail: string[] = []
  private startTime = 0
  private toolCallCount = 0
  private sawPermissionRequest = false
  private _requestId: string | null = null
  private _cleaningUp = false

  get requestId(): string | null {
    return this._requestId
  }

  get isRunning(): boolean {
    return this.process !== null && this.process.exitCode === null
  }

  get pid(): number | undefined {
    return this.process?.pid
  }

  startRun(requestId: string, options: RunOptions): void {
    if (this.isRunning) {
      throw new Error('A run is already in progress')
    }
    if (this._cleaningUp) {
      throw new Error('Previous run is still cleaning up — try again shortly')
    }

    this._requestId = requestId
    this.stderrTail = []
    this.stdoutTail = []
    this.startTime = Date.now()
    this.toolCallCount = 0
    this.sawPermissionRequest = false

    const claudeBin = findClaudeBinary()
    const args = this.buildArgs(options)

    const proc = spawn(claudeBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: options.projectPath,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
    })

    this.process = proc

    // Parse stdout NDJSON
    if (proc.stdout) {
      const parser = StreamParser.fromStream(proc.stdout)

      parser.on('event', (raw: ClaudeEvent) => {
        // Ring buffer for diagnostics
        const line = JSON.stringify(raw).slice(0, 300)
        this.stdoutTail.push(line)
        if (this.stdoutTail.length > MAX_RING_LINES) this.stdoutTail.shift()

        // Track tool calls
        if (raw.type === 'stream_event' && raw.event?.type === 'content_block_start') {
          if (raw.event.content_block?.type === 'tool_use') {
            this.toolCallCount++
          }
        }
        if (raw.type === 'permission_request') {
          this.sawPermissionRequest = true
        }

        // Normalize and emit
        const events = normalizeEvent(raw)
        for (const event of events) {
          this.emit('normalized', requestId, event)
        }
      })

      parser.on('parse-error', (line: string) => {
        console.warn('[RunManager] Parse error on line:', line.slice(0, 200))
      })
    }

    // Capture stderr
    if (proc.stderr) {
      proc.stderr.setEncoding('utf-8')
      proc.stderr.on('data', (chunk: string) => {
        const lines = chunk.split('\n').filter((l) => l.trim())
        for (const line of lines) {
          this.stderrTail.push(line)
          if (this.stderrTail.length > MAX_RING_LINES) this.stderrTail.shift()
        }
      })
    }

    // Process exit
    proc.on('exit', (code, signal) => {
      const sessionId = this.extractSessionId()
      this.emit('exit', requestId, code, signal, sessionId)
      // Clean up after a delay so diagnostics are available
      this._cleaningUp = true
      setTimeout(() => {
        if (this._requestId === requestId) {
          this.process = null
          this._requestId = null
        }
        this._cleaningUp = false
      }, 5000)
    })

    proc.on('error', (err) => {
      this.emit('error', requestId, err)
    })

    // Send the prompt via stdin
    this.writeToStdin({
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: options.prompt }],
      },
    })
  }

  /** Send a follow-up message or permission response via stdin. */
  writeToStdin(message: object): boolean {
    if (!this.process?.stdin?.writable) return false
    try {
      this.process.stdin.write(JSON.stringify(message) + '\n')
      return true
    } catch {
      return false
    }
  }

  /** Cancel the current run. SIGINT first, SIGKILL after 5s. */
  cancel(): boolean {
    if (!this.process || this.process.exitCode !== null) return false

    this.process.kill('SIGINT')

    // Force kill after 5 seconds
    const proc = this.process
    setTimeout(() => {
      try {
        if (proc.exitCode === null) {
          proc.kill('SIGKILL')
        }
      } catch {
        // Process already gone
      }
    }, 5000)

    return true
  }

  /** Get enriched error diagnostics. */
  getEnrichedError(exitCode: number | null): EnrichedError {
    return {
      message: `Claude process exited with code ${exitCode}`,
      stderrTail: this.stderrTail.slice(-20),
      stdoutTail: this.stdoutTail.slice(-20),
      exitCode,
      elapsedMs: Date.now() - this.startTime,
      toolCallCount: this.toolCallCount,
      sawPermissionRequest: this.sawPermissionRequest,
    }
  }

  private buildArgs(options: RunOptions): string[] {
    const args = [
      '-p',
      '--input-format', 'stream-json',
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
    ]

    if (options.sessionId) {
      args.push('--resume', options.sessionId)
    }

    if (options.model) {
      args.push('--model', options.model)
    }

    // Allowed tools
    const tools = options.allowedTools ?? DEFAULT_ALLOWED_TOOLS
    if (tools.length > 0) {
      args.push('--allowedTools', tools.join(','))
    }

    if (options.maxTurns) {
      args.push('--max-turns', String(options.maxTurns))
    }

    if (options.maxBudgetUsd) {
      args.push('--max-budget-usd', String(options.maxBudgetUsd))
    }

    if (options.systemPrompt) {
      args.push('--system-prompt', options.systemPrompt)
    }

    if (options.appendSystemPrompt) {
      args.push('--append-system-prompt', options.appendSystemPrompt)
    }

    if (options.hookSettingsPath) {
      args.push('--settings', options.hookSettingsPath)
    }

    if (options.addDirs) {
      for (const dir of options.addDirs) {
        args.push('--add-dir', dir)
      }
    }

    return args
  }

  /** Extract session ID from recent events if available. */
  private extractSessionId(): string | null {
    // Look through stdout tail for the last session_id
    for (let i = this.stdoutTail.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(this.stdoutTail[i])
        if (parsed.session_id) return parsed.session_id
      } catch {
        // Truncated lines, ignore
      }
    }
    return null
  }
}

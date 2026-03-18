import { EventEmitter } from 'events'
import { RunManager } from './run-manager'
import { PermissionServer } from './permission-server'
import type { NormalizedEvent, SessionStatus, RunOptions, RunResult } from './types'

/**
 * Simplified single-session control plane for Folio.
 * No tab registry, no request queue — one active session at a time.
 */
export class SessionManager extends EventEmitter {
  private runManager: RunManager
  private permissionServer: PermissionServer

  private _status: SessionStatus = 'idle'
  private _sessionId: string | null = null
  private _activeRequestId: string | null = null
  private _lastResult: RunResult | null = null
  private _model: string | null = null
  private _tools: string[] = []

  constructor() {
    super()
    this.runManager = new RunManager()
    this.permissionServer = new PermissionServer()
    this.wireEvents()
  }

  get status(): SessionStatus { return this._status }
  get sessionId(): string | null { return this._sessionId }
  get activeRequestId(): string | null { return this._activeRequestId }
  get lastResult(): RunResult | null { return this._lastResult }
  get model(): string | null { return this._model }
  get tools(): string[] { return this._tools }

  /** Initialize the permission server. Call once at startup. */
  async initialize(): Promise<void> {
    await this.permissionServer.start()
  }

  /** Send a prompt to Claude. */
  async sendPrompt(requestId: string, options: Omit<RunOptions, 'hookSettingsPath' | 'sessionId'>): Promise<void> {
    if (this.runManager.isRunning) {
      throw new Error('A prompt is already running')
    }

    this._activeRequestId = requestId
    this.setStatus('connecting')

    // Register run with permission server
    const runToken = this.permissionServer.registerRun(this._sessionId)
    const settingsPath = this.permissionServer.getSettingsPath()

    // Build system prompt hint for Folio context
    const folioHint = [
      'You are running inside Folio, a markdown editor with Claude Code integration.',
      options.projectPath ? `Current vault: ${options.projectPath}` : '',
      'The user can see your responses rendered as markdown with tool call cards.',
      'Render markdown freely.',
    ].filter(Boolean).join(' ')

    const runOptions: RunOptions = {
      ...options,
      sessionId: this._sessionId ?? undefined,
      hookSettingsPath: settingsPath ?? undefined,
      appendSystemPrompt: options.appendSystemPrompt
        ? `${options.appendSystemPrompt}\n\n${folioHint}`
        : folioHint,
    }

    try {
      this.runManager.startRun(requestId, runOptions)
    } catch (err) {
      this.setStatus('failed')
      this._activeRequestId = null
      throw err
    }
  }

  /** Cancel the current run. */
  cancel(): boolean {
    if (!this.runManager.isRunning) return false
    return this.runManager.cancel()
  }

  /** Respond to a permission request. */
  respondToPermission(questionId: string, decision: 'allow' | 'deny' | 'allow-session'): boolean {
    return this.permissionServer.respondToPermission(questionId, decision)
  }

  /** Reset session (start fresh conversation). */
  resetSession(): void {
    // Cancel active run before clearing state
    if (this.runManager.isRunning) {
      this.cancel()
      this.permissionServer.unregisterRun()
    }

    this._activeRequestId = null
    this._sessionId = null
    this._lastResult = null
    this._model = null
    this._tools = []
    this.setStatus('idle')
  }

  /** Get current status info. */
  getStatusInfo(): {
    status: SessionStatus
    sessionId: string | null
    model: string | null
    lastResult: RunResult | null
  } {
    return {
      status: this._status,
      sessionId: this._sessionId,
      model: this._model,
      lastResult: this._lastResult,
    }
  }

  /** Clean up on shutdown. */
  destroy(): void {
    this.cancel()
    this.permissionServer.stop()
  }

  private wireEvents(): void {
    // Normalized events from RunManager
    this.runManager.on('normalized', (requestId: string, event: NormalizedEvent) => {
      if (requestId !== this._activeRequestId) return

      // Handle session init
      if (event.type === 'session_init') {
        this._sessionId = event.sessionId
        this._model = event.model
        this._tools = event.tools
        this.setStatus('running')
      }

      // Forward all events to renderer
      this.emit('event', event)
    })

    // Process exit
    this.runManager.on('exit', (requestId: string, code: number | null, signal: string | null, sessionId: string | null) => {
      if (requestId !== this._activeRequestId) return

      // Preserve session ID from exit
      if (sessionId) {
        this._sessionId = sessionId
      }

      // Clean up permission server
      this.permissionServer.unregisterRun()

      if (signal === 'SIGINT' || signal === 'SIGKILL') {
        // User cancelled
        this.setStatus('idle')
      } else if (code === 0) {
        this.setStatus('completed')
      } else {
        // Non-zero exit
        const error = this.runManager.getEnrichedError(code)
        this.emit('event', {
          type: 'session_dead',
          exitCode: code,
          signal,
          stderrTail: error.stderrTail,
        } as NormalizedEvent)
        this.setStatus('failed')
      }

      this._activeRequestId = null
    })

    // Process error
    this.runManager.on('error', (requestId: string, err: Error) => {
      if (requestId !== this._activeRequestId) return

      this.permissionServer.unregisterRun()

      this.emit('event', {
        type: 'error',
        message: err.message,
        isError: true,
      } as NormalizedEvent)

      this.setStatus('dead')
      this._activeRequestId = null
    })

    // Permission requests from hook server
    this.permissionServer.on('permission-request', (request) => {
      this.emit('event', {
        type: 'permission_request',
        questionId: request.questionId,
        toolName: request.toolName,
        toolInput: request.toolInput,
        options: request.options,
      } as NormalizedEvent)
    })
  }

  private setStatus(status: SessionStatus): void {
    const old = this._status
    this._status = status
    this.emit('status-change', status, old)
  }
}

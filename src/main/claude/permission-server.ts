import { createServer } from 'http'
import type { Server, IncomingMessage, ServerResponse } from 'http'
import { EventEmitter } from 'events'
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import type { PermissionOption } from './types'

const DEFAULT_PORT = 19836
const MAX_BODY_SIZE = 1024 * 1024 // 1MB
const PERMISSION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

const PERMISSION_REQUIRED_TOOLS = new Set(['Bash', 'Edit', 'Write', 'MultiEdit'])

const SAFE_BASH_COMMANDS = new Set([
  'cat', 'head', 'tail', 'ls', 'find', 'grep', 'rg', 'git',
  'env', 'npm', 'node', 'python', 'python3', 'jq', 'diff',
  'sort', 'wc', 'echo', 'pwd', 'which', 'whence', 'type',
  'date', 'uname', 'hostname', 'whoami', 'id', 'printenv',
  'tree', 'stat', 'file', 'basename', 'dirname', 'realpath',
])

const GIT_MUTATING_SUBCOMMANDS = new Set([
  'push', 'commit', 'merge', 'rebase', 'reset', 'checkout',
  'branch', 'tag', 'stash', 'cherry-pick', 'revert', 'am',
  'apply', 'bisect', 'clean', 'gc', 'prune', 'remote',
])

interface PendingPermission {
  resolve: (response: HookResponse) => void
  timer: NodeJS.Timeout
  questionId: string
}

interface HookResponse {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse'
    permissionDecision: 'allow' | 'deny'
    permissionDecisionReason: string
  }
}

interface PermissionRequest {
  questionId: string
  toolName: string
  toolInput: Record<string, unknown>
  options: PermissionOption[]
}

/**
 * HTTP server intercepting Claude Code's PreToolUse hooks.
 * Forwards permission requests to the renderer for UI approval.
 */
export class PermissionServer extends EventEmitter {
  private server: Server | null = null
  private port = DEFAULT_PORT
  private appSecret: string
  private runToken: string | null = null
  private settingsPath: string | null = null
  private pending: Map<string, PendingPermission> = new Map()
  private scopedAllows: Set<string> = new Set()
  private _ready = false

  constructor() {
    super()
    this.appSecret = randomUUID()
  }

  get isReady(): boolean {
    return this._ready
  }

  /** Start the HTTP server. */
  async start(): Promise<void> {
    if (this.server) return

    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res))

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          // Try next port
          this.port++
          this.server?.listen(this.port)
        } else {
          reject(err)
        }
      })

      this.server.on('listening', () => {
        this._ready = true
        resolve()
      })

      this.server.listen(this.port)
    })
  }

  /** Register a run and create the hook settings file. */
  registerRun(sessionId: string | null): string {
    this.runToken = randomUUID()
    this.scopedAllows.clear()

    // Write settings file with hook config
    const configDir = join(tmpdir(), 'folio-hook-config')
    mkdirSync(configDir, { recursive: true })
    this.settingsPath = join(configDir, `folio-hook-${this.runToken}.json`)

    const hookUrl = `http://127.0.0.1:${this.port}/hook/pre-tool-use/${this.appSecret}/${this.runToken}`

    const settings = {
      hooks: {
        PreToolUse: [{
          matcher: '^(Bash|Edit|Write|MultiEdit|mcp__.*)$',
          hooks: [{
            type: 'http',
            url: hookUrl,
            timeout: 300,
          }],
        }],
      },
    }

    writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2))
    return this.runToken
  }

  /** Get the path to the generated settings file. */
  getSettingsPath(): string | null {
    return this.settingsPath
  }

  /** Unregister a run and clean up. */
  unregisterRun(): void {
    // Deny all pending permissions
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.resolve(this.denyResponse('Run ended'))
    }
    this.pending.clear()

    // Clean up settings file
    if (this.settingsPath && existsSync(this.settingsPath)) {
      try {
        unlinkSync(this.settingsPath)
      } catch {
        // Ignore
      }
    }
    this.settingsPath = null
    this.runToken = null
  }

  /** Respond to a pending permission request. */
  respondToPermission(questionId: string, decision: 'allow' | 'deny' | 'allow-session'): boolean {
    const pending = this.pending.get(questionId)
    if (!pending) return false

    clearTimeout(pending.timer)
    this.pending.delete(questionId)

    // Track scoped allows
    if (decision === 'allow-session') {
      // Extract scope from questionId (format: toolName:hash)
      const parts = questionId.split(':')
      if (parts.length > 0) {
        this.scopedAllows.add(`tool:${parts[0]}`)
      }
      decision = 'allow'
    }

    pending.resolve({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision === 'deny' ? 'deny' : 'allow',
        permissionDecisionReason: decision === 'deny' ? 'User denied' : 'User approved',
      },
    })

    return true
  }

  /** Stop the server. */
  stop(): void {
    this.unregisterRun()
    if (this.server) {
      this.server.close()
      this.server = null
      this._ready = false
    }
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Only accept POST
    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end()
      return
    }

    // Parse URL
    const url = req.url ?? ''
    const parts = url.split('/')
    // Expected: /hook/pre-tool-use/{appSecret}/{runToken}
    if (parts.length < 5 || parts[1] !== 'hook' || parts[2] !== 'pre-tool-use') {
      res.writeHead(404)
      res.end()
      return
    }

    const secret = parts[3]
    const token = parts[4]

    // Validate secret and token
    if (secret !== this.appSecret || token !== this.runToken) {
      res.writeHead(403)
      res.end(JSON.stringify(this.denyResponse('Invalid credentials')))
      return
    }

    // Read body
    let body = ''
    try {
      body = await this.readBody(req)
    } catch {
      res.writeHead(400)
      res.end(JSON.stringify(this.denyResponse('Invalid request body')))
      return
    }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(body)
    } catch {
      res.writeHead(400)
      res.end(JSON.stringify(this.denyResponse('Invalid JSON')))
      return
    }

    const toolName = (payload.tool_name as string) ?? ''
    const toolInput = (payload.tool_input as Record<string, unknown>) ?? {}

    // Check if tool needs permission
    const isMcp = toolName.startsWith('mcp__')
    if (!PERMISSION_REQUIRED_TOOLS.has(toolName) && !isMcp) {
      res.writeHead(200)
      res.end(JSON.stringify(this.allowResponse('Auto-approved safe tool')))
      return
    }

    // Check scoped allows
    if (this.scopedAllows.has(`tool:${toolName}`)) {
      res.writeHead(200)
      res.end(JSON.stringify(this.allowResponse('Session-scoped allow')))
      return
    }

    // Check safe bash commands
    if (toolName === 'Bash' && this.isSafeBashCommand(toolInput.command as string)) {
      res.writeHead(200)
      res.end(JSON.stringify(this.allowResponse('Auto-approved safe command')))
      return
    }

    // Need user permission — emit event and wait
    const questionId = `${toolName}:${randomUUID().slice(0, 8)}`
    const options = this.getOptionsForTool(toolName)
    const maskedInput = this.maskSensitiveFields(toolInput)

    const permRequest: PermissionRequest = {
      questionId,
      toolName,
      toolInput: maskedInput,
      options,
    }

    // Create promise that will be resolved when user responds
    const responsePromise = new Promise<HookResponse>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(questionId)
        resolve(this.denyResponse('Permission timed out after 5 minutes'))
      }, PERMISSION_TIMEOUT_MS)

      this.pending.set(questionId, { resolve, timer, questionId })
    })

    // Emit to renderer
    this.emit('permission-request', permRequest)

    // Wait for user response
    const response = await responsePromise

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response))
  }

  private isSafeBashCommand(command: string | undefined): boolean {
    if (!command) return false

    // Extract first command (before pipes, semicolons, &&)
    const firstCmd = command.split(/[|;&]/).shift()?.trim() ?? ''
    const parts = firstCmd.split(/\s+/)
    const baseCmd = parts[0]

    if (!baseCmd || !SAFE_BASH_COMMANDS.has(baseCmd)) return false

    // Git: block mutating subcommands
    if (baseCmd === 'git') {
      const subCmd = parts[1]
      if (subCmd && GIT_MUTATING_SUBCOMMANDS.has(subCmd)) return false
    }

    // Block file redirections (except /dev/null)
    if (/>[^>]/.test(command) && !/>\s*\/dev\/null/.test(command) && !/2>&1/.test(command)) {
      return false
    }

    return true
  }

  private getOptionsForTool(toolName: string): PermissionOption[] {
    const options: PermissionOption[] = [
      { id: 'allow', label: 'Allow Once' },
    ]

    // Edit/Write/MultiEdit can be session-scoped
    if (toolName !== 'Bash') {
      options.push({ id: 'allow-session', label: 'Allow for Session' })
    }

    options.push({ id: 'deny', label: 'Deny' })
    return options
  }

  private maskSensitiveFields(input: Record<string, unknown>): Record<string, unknown> {
    const sensitivePattern = /token|password|secret|key|auth|credential|api.?key/i
    const masked: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      if (sensitivePattern.test(key) && typeof value === 'string') {
        masked[key] = '***REDACTED***'
      } else {
        masked[key] = value
      }
    }
    return masked
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = ''
      req.setEncoding('utf-8')
      req.on('data', (chunk) => {
        body += chunk
        if (body.length > MAX_BODY_SIZE) {
          reject(new Error('Body too large'))
        }
      })
      req.on('end', () => resolve(body))
      req.on('error', reject)
    })
  }

  private allowResponse(reason: string): HookResponse {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: reason,
      },
    }
  }

  private denyResponse(reason: string): HookResponse {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }
  }
}

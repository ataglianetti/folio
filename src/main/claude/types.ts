// --- Raw events from `claude -p --output-format stream-json` ---

export interface InitEvent {
  type: 'system'
  subtype: 'init'
  session_id: string
  tools: string[]
  model: string
  mcp_servers: Array<{ name: string; status: string }>
  skills?: string[]
  claude_version?: string
}

export interface StreamEvent {
  type: 'stream_event'
  event: StreamSubEvent
  session_id: string
  parent_tool_use_id: string | null
  uuid: string
}

export type StreamSubEvent =
  | { type: 'message_start'; message: AssistantMessagePayload }
  | { type: 'content_block_start'; index: number; content_block: ContentBlock }
  | { type: 'content_block_delta'; index: number; delta: ContentDelta }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_delta'; delta: { stop_reason?: string }; usage?: TokenUsage; context_management?: unknown }
  | { type: 'message_stop' }

export interface AssistantMessagePayload {
  id: string
  type: 'message'
  role: 'assistant'
  content: ContentBlock[]
  model: string
  stop_reason?: string
  usage?: TokenUsage
}

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

export type ContentDelta =
  | { type: 'text_delta'; text: string }
  | { type: 'input_json_delta'; partial_json: string }

export interface TokenUsage {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export interface AssistantEvent {
  type: 'assistant'
  message: AssistantMessagePayload
  session_id: string
}

export interface ResultEvent {
  type: 'result'
  subtype: string
  result?: string
  is_error?: boolean
  cost_usd?: number
  duration_ms?: number
  num_turns?: number
  usage?: TokenUsage
  session_id?: string
  permission_denials?: Array<{ tool_name: string; tool_use_id: string }>
}

export interface RateLimitEvent {
  type: 'rate_limit_event'
  status: string
  resets_at: string
  rate_limit_type: string
}

export interface PermissionEvent {
  type: 'permission_request'
  question_id: string
  tool_name: string
  tool_description?: string
  tool_input: Record<string, unknown>
  options: PermissionOption[]
}

export interface PermissionOption {
  id: string
  label: string
  description?: string
}

export type ClaudeEvent =
  | InitEvent
  | StreamEvent
  | AssistantEvent
  | ResultEvent
  | RateLimitEvent
  | PermissionEvent
  | { type: string; [key: string]: unknown }

// --- Normalized events (CLUI canonical) ---

export type NormalizedEvent =
  | { type: 'session_init'; sessionId: string; tools: string[]; model: string; mcpServers: Array<{ name: string; status: string }>; skills?: string[]; version?: string; isWarmup?: boolean }
  | { type: 'text_chunk'; text: string }
  | { type: 'tool_call'; toolName: string; toolId: string; index: number }
  | { type: 'tool_call_update'; toolId: string; partialInput: string }
  | { type: 'tool_call_complete'; index: number }
  | { type: 'task_update'; message: AssistantMessagePayload }
  | { type: 'task_complete'; result?: string; costUsd?: number; durationMs?: number; numTurns?: number; usage?: TokenUsage; sessionId?: string; permissionDenials?: Array<{ tool_name: string; tool_use_id: string }> }
  | { type: 'error'; message: string; isError: boolean; sessionId?: string }
  | { type: 'session_dead'; exitCode: number | null; signal: string | null; stderrTail: string[] }
  | { type: 'rate_limit'; status: string; resetsAt: string; rateLimitType: string }
  | { type: 'permission_request'; questionId: string; toolName: string; toolDescription?: string; toolInput: Record<string, unknown>; options: PermissionOption[] }

// --- Session/Run types ---

export type SessionStatus = 'idle' | 'connecting' | 'running' | 'completed' | 'failed' | 'dead'

export interface RunOptions {
  prompt: string
  projectPath: string
  sessionId?: string
  allowedTools?: string[]
  maxTurns?: number
  maxBudgetUsd?: number
  systemPrompt?: string
  appendSystemPrompt?: string
  model?: string
  hookSettingsPath?: string
  addDirs?: string[]
}

export interface RunHandle {
  requestId: string
  pid: number | undefined
}

export interface EnrichedError {
  message: string
  stderrTail: string[]
  stdoutTail?: string[]
  exitCode: number | null
  elapsedMs: number
  toolCallCount: number
  sawPermissionRequest?: boolean
  permissionDenials?: Array<{ tool_name: string; tool_use_id: string }>
}

export interface RunResult {
  costUsd?: number
  durationMs?: number
  numTurns?: number
  usage?: TokenUsage
  sessionId?: string
}

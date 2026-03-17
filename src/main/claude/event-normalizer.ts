import type {
  ClaudeEvent,
  NormalizedEvent,
  StreamEvent,
  InitEvent,
  AssistantEvent,
  ResultEvent,
  RateLimitEvent,
  PermissionEvent,
} from './types'

/**
 * Stateless normalizer: maps raw Claude stream-json events to canonical types.
 * Returns an array (0 or 1 events) for each raw event.
 */
export function normalizeEvent(raw: ClaudeEvent): NormalizedEvent[] {
  switch (raw.type) {
    case 'system':
      return normalizeSystem(raw as InitEvent)

    case 'stream_event':
      return normalizeStream(raw as StreamEvent)

    case 'assistant':
      return normalizeAssistant(raw as AssistantEvent)

    case 'result':
      return normalizeResult(raw as ResultEvent)

    case 'rate_limit_event':
      return normalizeRateLimit(raw as RateLimitEvent)

    case 'permission_request':
      return normalizePermission(raw as PermissionEvent)

    default:
      return []
  }
}

function normalizeSystem(event: InitEvent): NormalizedEvent[] {
  if (event.subtype !== 'init') return []

  return [{
    type: 'session_init',
    sessionId: event.session_id,
    tools: event.tools ?? [],
    model: event.model ?? '',
    mcpServers: event.mcp_servers ?? [],
    skills: event.skills,
    version: event.claude_version,
  }]
}

function normalizeStream(event: StreamEvent): NormalizedEvent[] {
  const sub = event.event
  if (!sub) return []

  switch (sub.type) {
    case 'content_block_start': {
      if (sub.content_block?.type === 'tool_use') {
        const block = sub.content_block as { type: 'tool_use'; id: string; name: string }
        return [{
          type: 'tool_call',
          toolName: block.name,
          toolId: block.id,
          index: sub.index,
        }]
      }
      return []
    }

    case 'content_block_delta': {
      if (sub.delta?.type === 'text_delta') {
        return [{
          type: 'text_chunk',
          text: sub.delta.text,
        }]
      }
      if (sub.delta?.type === 'input_json_delta') {
        return [{
          type: 'tool_call_update',
          toolId: '', // Will be correlated by the consumer via index tracking
          partialInput: sub.delta.partial_json,
        }]
      }
      return []
    }

    case 'content_block_stop': {
      return [{
        type: 'tool_call_complete',
        index: sub.index,
      }]
    }

    default:
      return []
  }
}

function normalizeAssistant(event: AssistantEvent): NormalizedEvent[] {
  return [{
    type: 'task_update',
    message: event.message,
  }]
}

function normalizeResult(event: ResultEvent): NormalizedEvent[] {
  if (event.is_error) {
    return [{
      type: 'error',
      message: event.result ?? 'Unknown error',
      isError: true,
      sessionId: event.session_id,
    }]
  }

  return [{
    type: 'task_complete',
    result: event.result,
    costUsd: event.cost_usd,
    durationMs: event.duration_ms,
    numTurns: event.num_turns,
    usage: event.usage,
    sessionId: event.session_id,
    permissionDenials: event.permission_denials,
  }]
}

function normalizeRateLimit(event: RateLimitEvent): NormalizedEvent[] {
  return [{
    type: 'rate_limit',
    status: event.status,
    resetsAt: event.resets_at,
    rateLimitType: event.rate_limit_type,
  }]
}

function normalizePermission(event: PermissionEvent): NormalizedEvent[] {
  return [{
    type: 'permission_request',
    questionId: event.question_id,
    toolName: event.tool_name,
    toolDescription: event.tool_description,
    toolInput: event.tool_input ?? {},
    options: event.options ?? [],
  }]
}

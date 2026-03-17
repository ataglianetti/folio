import { create } from 'zustand'

export type SessionStatus = 'idle' | 'connecting' | 'running' | 'completed' | 'failed' | 'dead'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string
  toolName?: string
  toolInput?: string
  toolStatus?: 'running' | 'completed' | 'error'
  timestamp: number
}

export interface PermissionRequest {
  questionId: string
  toolName: string
  toolInput: Record<string, unknown>
  options: Array<{ id: string; label: string; description?: string }>
}

export interface RunResult {
  costUsd?: number
  durationMs?: number
  numTurns?: number
  sessionId?: string
}

interface ClaudeState {
  status: SessionStatus
  sessionId: string | null
  messages: Message[]
  permissionQueue: PermissionRequest[]
  lastResult: RunResult | null
  currentActivity: string

  sendPrompt: (prompt: string) => Promise<void>
  cancel: () => Promise<void>
  respondToPermission: (questionId: string, optionId: string) => void
  resetSession: () => void
  handleEvent: (event: Record<string, unknown>) => void
  handleStatusChange: (status: string) => void
}

let messageCounter = 0
function nextId(): string {
  return `msg-${++messageCounter}-${Date.now()}`
}

export const useClaudeStore = create<ClaudeState>((set, get) => ({
  status: 'idle',
  sessionId: null,
  messages: [],
  permissionQueue: [],
  lastResult: null,
  currentActivity: '',

  sendPrompt: async (prompt: string) => {
    const { status } = get()
    if (status === 'running' || status === 'connecting') {
      return // Already busy
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Optimistic: add user message, set status
    set((state) => ({
      status: 'connecting' as SessionStatus,
      currentActivity: 'Connecting...',
      messages: [
        ...state.messages,
        {
          id: nextId(),
          role: 'user' as const,
          content: prompt,
          timestamp: Date.now(),
        },
      ],
    }))

    try {
      await window.folio.claude.sendPrompt(requestId, prompt)
    } catch (err) {
      set({
        status: 'failed',
        currentActivity: '',
        messages: [
          ...get().messages,
          {
            id: nextId(),
            role: 'system',
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          },
        ],
      })
    }
  },

  cancel: async () => {
    await window.folio.claude.cancel()
    set({ currentActivity: 'Cancelling...' })
  },

  respondToPermission: (questionId: string, optionId: string) => {
    window.folio.claude.respondPermission(questionId, optionId)

    set((state) => ({
      permissionQueue: state.permissionQueue.filter((p) => p.questionId !== questionId),
      currentActivity: state.permissionQueue.length > 1
        ? `Waiting for permission: ${state.permissionQueue[1]?.toolName}`
        : '',
    }))
  },

  resetSession: () => {
    window.folio.claude.resetSession()
    set({
      status: 'idle',
      sessionId: null,
      messages: [],
      permissionQueue: [],
      lastResult: null,
      currentActivity: '',
    })
  },

  handleEvent: (event: Record<string, unknown>) => {
    const type = event.type as string

    switch (type) {
      case 'session_init': {
        set({
          sessionId: event.sessionId as string,
          status: 'running',
          currentActivity: 'Thinking...',
        })
        break
      }

      case 'text_chunk': {
        const text = event.text as string
        set((state) => {
          const msgs = [...state.messages]
          const last = msgs[msgs.length - 1]

          if (last?.role === 'assistant') {
            // Append to existing assistant message
            msgs[msgs.length - 1] = { ...last, content: last.content + text }
          } else {
            // Start new assistant message
            msgs.push({
              id: nextId(),
              role: 'assistant',
              content: text,
              timestamp: Date.now(),
            })
          }
          return { messages: msgs, currentActivity: 'Writing...' }
        })
        break
      }

      case 'tool_call': {
        const toolName = event.toolName as string
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: nextId(),
              role: 'tool' as const,
              content: '',
              toolName,
              toolId: event.toolId as string,
              toolInput: '',
              toolStatus: 'running' as const,
              timestamp: Date.now(),
            },
          ],
          currentActivity: `Running ${toolName}...`,
        }))
        break
      }

      case 'tool_call_update': {
        const partialInput = event.partialInput as string
        set((state) => {
          const msgs = [...state.messages]
          // Find last running tool
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'tool' && msgs[i].toolStatus === 'running') {
              msgs[i] = {
                ...msgs[i],
                toolInput: (msgs[i].toolInput ?? '') + partialInput,
              }
              break
            }
          }
          return { messages: msgs }
        })
        break
      }

      case 'tool_call_complete': {
        set((state) => {
          const msgs = [...state.messages]
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'tool' && msgs[i].toolStatus === 'running') {
              msgs[i] = { ...msgs[i], toolStatus: 'completed' as const }
              break
            }
          }
          return { messages: msgs, currentActivity: 'Thinking...' }
        })
        break
      }

      case 'task_complete': {
        set({
          status: 'completed',
          currentActivity: '',
          lastResult: {
            costUsd: event.costUsd as number | undefined,
            durationMs: event.durationMs as number | undefined,
            numTurns: event.numTurns as number | undefined,
            sessionId: event.sessionId as string | undefined,
          },
        })
        break
      }

      case 'error': {
        set((state) => ({
          status: 'failed' as SessionStatus,
          currentActivity: '',
          messages: [
            ...state.messages,
            {
              id: nextId(),
              role: 'system' as const,
              content: `Error: ${event.message as string}`,
              timestamp: Date.now(),
            },
          ],
        }))
        break
      }

      case 'session_dead': {
        const stderrTail = (event.stderrTail as string[]) ?? []
        set((state) => ({
          status: 'dead' as SessionStatus,
          currentActivity: '',
          messages: [
            ...state.messages,
            {
              id: nextId(),
              role: 'system' as const,
              content: `Session died (exit code: ${event.exitCode})${stderrTail.length > 0 ? '\n' + stderrTail.slice(-3).join('\n') : ''}`,
              timestamp: Date.now(),
            },
          ],
        }))
        break
      }

      case 'permission_request': {
        set((state) => ({
          permissionQueue: [
            ...state.permissionQueue,
            {
              questionId: event.questionId as string,
              toolName: event.toolName as string,
              toolInput: event.toolInput as Record<string, unknown>,
              options: event.options as PermissionRequest['options'],
            },
          ],
          currentActivity: `Waiting for permission: ${event.toolName as string}`,
        }))
        break
      }

      case 'rate_limit': {
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: nextId(),
              role: 'system' as const,
              content: `Rate limited. Resets at ${event.resetsAt as string}`,
              timestamp: Date.now(),
            },
          ],
        }))
        break
      }
    }
  },

  handleStatusChange: (status: string) => {
    set({ status: status as SessionStatus })
  },
}))

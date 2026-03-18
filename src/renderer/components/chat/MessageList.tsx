import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClaudeStore, type Message } from '../../stores/claude'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { ToolTimeline } from './ToolTimeline'
import { PermissionCard } from './PermissionCard'
import { Sparkle } from '@phosphor-icons/react'

// ─── Constants ───

const NEAR_BOTTOM_THRESHOLD = 60
const INITIAL_RENDER_CAP = 100
const PAGE_SIZE = 100

// ─── Message grouping ───

type GroupedItem =
  | { kind: 'user'; message: Message }
  | { kind: 'assistant'; message: Message }
  | { kind: 'system'; message: Message }
  | { kind: 'tool-group'; messages: Message[] }

function groupMessages(messages: Message[]): GroupedItem[] {
  const result: GroupedItem[] = []
  let toolBuf: Message[] = []

  const flushTools = () => {
    if (toolBuf.length > 0) {
      result.push({ kind: 'tool-group', messages: [...toolBuf] })
      toolBuf = []
    }
  }

  for (const msg of messages) {
    if (msg.role === 'tool') {
      toolBuf.push(msg)
    } else {
      flushTools()
      if (msg.role === 'user') result.push({ kind: 'user', message: msg })
      else if (msg.role === 'assistant') result.push({ kind: 'assistant', message: msg })
      else result.push({ kind: 'system', message: msg })
    }
  }
  flushTools()
  return result
}

// ─── Main Component ───

export function MessageList() {
  const messages = useClaudeStore((s) => s.messages)
  const permissionQueue = useClaudeStore((s) => s.permissionQueue)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const [renderOffset, setRenderOffset] = useState(0)

  // Track whether user is scrolled near the bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD
  }, [])

  // Build a scroll trigger from content that changes
  const lastMsg = messages[messages.length - 1]
  const scrollTrigger = `${messages.length}:${lastMsg?.content?.length ?? 0}:${permissionQueue.length}`

  useEffect(() => {
    if (isNearBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [scrollTrigger])

  // Pagination — only render recent messages, load older on demand
  const totalCount = messages.length
  const startIndex = Math.max(0, totalCount - INITIAL_RENDER_CAP - renderOffset * PAGE_SIZE)
  const visibleMessages = startIndex > 0 ? messages.slice(startIndex) : messages
  const hasOlder = startIndex > 0
  const hiddenCount = totalCount - visibleMessages.length

  // Group visible messages
  const grouped = useMemo(() => groupMessages(visibleMessages), [visibleMessages])

  // Messages older than this threshold skip enter animations
  const historicalThreshold = Math.max(0, totalCount - 20)

  const handleLoadOlder = useCallback(() => {
    setRenderOffset((o) => o + 1)
  }, [])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ background: 'var(--accent-light)' }}
        >
          <Sparkle size={20} weight="fill" style={{ color: 'var(--accent)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Claude Code
        </p>
        <p className="text-[12px] mt-1 max-w-[200px]" style={{ color: 'var(--text-tertiary)' }}>
          Ask Claude to edit files, search your vault, or help you write.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-2"
      style={{ paddingBottom: 28 }}
    >
      {/* Load older button */}
      {hasOlder && (
        <div className="flex justify-center py-2">
          <button
            onClick={handleLoadOlder}
            className="text-[11px] px-3 py-1 rounded-full transition-colors cursor-pointer"
            style={{ color: 'var(--text-tertiary)', border: '1px solid var(--tool-border)' }}
          >
            Load {Math.min(PAGE_SIZE, hiddenCount)} older messages ({hiddenCount} hidden)
          </button>
        </div>
      )}

      <div className="space-y-1 relative">
        {grouped.map((item, idx) => {
          const msgIndex = startIndex + idx
          const isHistorical = msgIndex < historicalThreshold

          switch (item.kind) {
            case 'user':
              return (
                <MaybeAnimate key={item.message.id} skip={isHistorical}>
                  <UserMessage message={item.message} />
                </MaybeAnimate>
              )
            case 'assistant':
              return (
                <MaybeAnimate key={item.message.id} skip={isHistorical}>
                  <AssistantMessage message={item.message} />
                </MaybeAnimate>
              )
            case 'tool-group':
              return (
                <MaybeAnimate key={`tg-${item.messages[0].id}`} skip={isHistorical}>
                  <ToolTimeline tools={item.messages} skipMotion={isHistorical} />
                </MaybeAnimate>
              )
            case 'system':
              return (
                <MaybeAnimate key={item.message.id} skip={isHistorical}>
                  <SystemMessage message={item.message} />
                </MaybeAnimate>
              )
            default:
              return null
          }
        })}
      </div>

      {/* Permission cards — show first in queue with total count */}
      <AnimatePresence>
        {permissionQueue.length > 0 && (
          <PermissionCard
            key={permissionQueue[0].questionId}
            request={permissionQueue[0]}
            queueLength={permissionQueue.length}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Animation wrapper ───

function MaybeAnimate({ children, skip }: { children: React.ReactNode; skip: boolean }) {
  if (skip) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )
}

// ─── System Message ───

function SystemMessage({ message }: { message: Message }) {
  const isError = message.content.startsWith('Error:') || message.content.includes('unexpectedly')
  return (
    <div
      className="mb-2 px-3 py-2 rounded-lg text-[11px] whitespace-pre-wrap"
      style={{
        background: isError ? 'var(--perm-deny-bg)' : 'var(--surface-primary)',
        color: isError ? 'var(--error)' : 'var(--text-tertiary)',
        border: '1px solid var(--border)',
      }}
    >
      {message.content}
    </div>
  )
}

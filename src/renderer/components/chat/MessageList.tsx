import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClaudeStore, type Message } from '../../stores/claude'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { ToolCard } from './ToolCard'
import { PermissionCard } from './PermissionCard'
import { Sparkle } from '@phosphor-icons/react'

export function MessageList() {
  const messages = useClaudeStore((s) => s.messages)
  const permissionQueue = useClaudeStore((s) => s.permissionQueue)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, permissionQueue])

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
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-2"
      style={{ paddingBottom: 28 }}
    >
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <MessageItem message={message} />
          </motion.div>
        ))}

        {permissionQueue.map((request) => (
          <PermissionCard key={request.questionId} request={request} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function MessageItem({ message }: { message: Message }) {
  switch (message.role) {
    case 'user':
      return <UserMessage message={message} />
    case 'assistant':
      return <AssistantMessage message={message} />
    case 'tool':
      return <ToolCard message={message} />
    case 'system':
      return (
        <div
          className="mb-2 px-3 py-2 rounded-lg text-[11px] whitespace-pre-wrap"
          style={{
            background: 'var(--surface-primary)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          {message.content}
        </div>
      )
    default:
      return null
  }
}

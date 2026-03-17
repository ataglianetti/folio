import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClaudeStore, type Message } from '../../stores/claude'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { ToolCard } from './ToolCard'
import { PermissionCard } from './PermissionCard'
import { Sparkle } from '@phosphor-icons/react'

const messageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
}

export function MessageList() {
  const messages = useClaudeStore((s) => s.messages)
  const permissionQueue = useClaudeStore((s) => s.permissionQueue)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new content
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
          style={{ background: 'var(--accent-soft)' }}
        >
          <Sparkle size={20} weight="fill" className="text-[var(--accent)]" />
        </div>
        <p className="text-[var(--text-secondary)] text-sm font-medium">Claude Code</p>
        <p className="text-[var(--text-muted)] text-[12px] mt-1 max-w-[200px]">
          Ask Claude to edit files, search your vault, or help you write.
        </p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            variants={messageVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            layout={false}
          >
            <MessageItem message={message} />
          </motion.div>
        ))}

        {permissionQueue.map((request) => (
          <motion.div
            key={request.questionId}
            variants={messageVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <PermissionCard request={request} />
          </motion.div>
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
        <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--bg-code)] text-[12px] text-[var(--text-muted)] whitespace-pre-wrap">
          {message.content}
        </div>
      )
    default:
      return null
  }
}

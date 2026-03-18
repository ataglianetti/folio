import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Square } from '@phosphor-icons/react'
import { useClaudeStore } from '../../stores/claude'

export function InputBar() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const status = useClaudeStore((s) => s.status)
  const sendPrompt = useClaudeStore((s) => s.sendPrompt)
  const cancel = useClaudeStore((s) => s.cancel)

  const isRunning = status === 'running' || status === 'connecting'
  const canSend = input.trim().length > 0 && !isRunning

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isRunning) return
    setInput('')
    sendPrompt(trimmed)
  }, [input, isRunning, sendPrompt])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [input])

  const placeholder = isRunning
    ? 'Type to queue a message...'
    : 'Ask Claude Code anything...'

  return (
    <div className="flex-shrink-0 px-3 pb-3 pt-1">
      <div
        className="flex items-center w-full transition-colors"
        style={{
          minHeight: 50,
          borderRadius: 25,
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          padding: '0 6px 0 16px',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent outline-none resize-none"
          style={{
            fontSize: 14,
            lineHeight: '20px',
            paddingTop: 15,
            paddingBottom: 15,
            color: 'var(--text-primary)',
            maxHeight: 140,
          }}
          onFocus={(e) => {
            const parent = e.currentTarget.parentElement
            if (parent) parent.style.borderColor = 'var(--input-focus-border)'
          }}
          onBlur={(e) => {
            const parent = e.currentTarget.parentElement
            if (parent) parent.style.borderColor = 'var(--border)'
          }}
        />

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {isRunning ? (
            <button
              onClick={() => cancel()}
              className="flex items-center justify-center cursor-pointer transition-colors"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--stop-bg)',
                color: '#ffffff',
              }}
              title="Stop"
            >
              <Square size={12} weight="fill" />
            </button>
          ) : (
            <AnimatePresence>
              {canSend && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  onClick={handleSend}
                  className="flex items-center justify-center cursor-pointer transition-colors"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--send-bg)',
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--send-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--send-bg)' }}
                  title="Send (Enter)"
                >
                  <ArrowUp size={16} weight="bold" />
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}

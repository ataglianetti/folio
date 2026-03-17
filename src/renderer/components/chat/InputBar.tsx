import { useState, useRef, useCallback, useEffect } from 'react'
import { PaperPlaneRight, Stop } from '@phosphor-icons/react'
import { useClaudeStore } from '../../stores/claude'

export function InputBar() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const status = useClaudeStore((s) => s.status)
  const sendPrompt = useClaudeStore((s) => s.sendPrompt)
  const cancel = useClaudeStore((s) => s.cancel)

  const isRunning = status === 'running' || status === 'connecting'

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

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  return (
    <div className="flex-shrink-0 border-t border-[var(--border)] p-3">
      <div className="flex items-end gap-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] focus-within:border-[var(--accent)] transition-colors px-3 py-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? 'Claude is working...' : 'Ask Claude...'}
          disabled={isRunning}
          rows={1}
          className="flex-1 bg-transparent outline-none resize-none text-[13px] leading-relaxed
            text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
            disabled:opacity-50 max-h-[120px]"
        />

        {isRunning ? (
          <button
            onClick={() => cancel()}
            className="flex-shrink-0 p-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            title="Stop"
          >
            <Stop size={18} weight="fill" className="text-[var(--accent)]" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 p-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors
              cursor-pointer disabled:opacity-30 disabled:cursor-default"
            title="Send (Enter)"
          >
            <PaperPlaneRight size={18} className="text-[var(--accent)]" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-1.5 px-1">
        <span className="text-[10px] text-[var(--text-muted)]">
          Enter to send, Shift+Enter for newline
        </span>
      </div>
    </div>
  )
}

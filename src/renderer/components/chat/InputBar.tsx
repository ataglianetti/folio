import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Square } from '@phosphor-icons/react'
import { useClaudeStore } from '../../stores/claude'
import { SlashCommandMenu, getFilteredCommands, type SlashCommand } from './SlashCommandMenu'

export function InputBar() {
  const [input, setInput] = useState('')
  const [slashFilter, setSlashFilter] = useState<string | null>(null)
  const [slashIndex, setSlashIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const status = useClaudeStore((s) => s.status)
  const sendPrompt = useClaudeStore((s) => s.sendPrompt)
  const cancel = useClaudeStore((s) => s.cancel)
  const resetSession = useClaudeStore((s) => s.resetSession)
  const lastResult = useClaudeStore((s) => s.lastResult)

  const isRunning = status === 'running' || status === 'connecting'
  const canSend = input.trim().length > 0 && !isRunning
  const showSlashMenu = slashFilter !== null

  // ─── Slash command detection ───
  const updateSlashFilter = useCallback((value: string) => {
    const match = value.match(/^(\/[a-zA-Z-]*)$/)
    if (match) {
      setSlashFilter(match[1])
      setSlashIndex(0)
    } else {
      setSlashFilter(null)
    }
  }, [])

  // ─── Execute slash commands ───
  const executeCommand = useCallback((cmd: SlashCommand) => {
    switch (cmd.command) {
      case '/clear':
        resetSession()
        break
      case '/cost': {
        if (lastResult) {
          const parts: string[] = []
          if (lastResult.costUsd !== undefined) parts.push(`$${lastResult.costUsd.toFixed(4)}`)
          if (lastResult.durationMs !== undefined) parts.push(`${(lastResult.durationMs / 1000).toFixed(1)}s`)
          if (lastResult.numTurns !== undefined) parts.push(`${lastResult.numTurns} turn${lastResult.numTurns !== 1 ? 's' : ''}`)
          // Add as system message via store
          useClaudeStore.setState((s) => ({
            messages: [...s.messages, {
              id: `msg-sys-${Date.now()}`,
              role: 'system' as const,
              content: parts.length > 0 ? parts.join(' · ') : 'No cost data available.',
              timestamp: Date.now(),
            }],
          }))
        } else {
          useClaudeStore.setState((s) => ({
            messages: [...s.messages, {
              id: `msg-sys-${Date.now()}`,
              role: 'system' as const,
              content: 'No cost data yet — send a message first.',
              timestamp: Date.now(),
            }],
          }))
        }
        break
      }
      case '/model': {
        const sessionId = useClaudeStore.getState().sessionId
        useClaudeStore.setState((s) => ({
          messages: [...s.messages, {
            id: `msg-sys-${Date.now()}`,
            role: 'system' as const,
            content: sessionId ? `Session: ${sessionId}` : 'No active session.',
            timestamp: Date.now(),
          }],
        }))
        break
      }
      case '/help': {
        const lines = [
          '/clear — Clear conversation and reset session',
          '/cost — Show token usage and cost from last run',
          '/model — Show current session info',
          '/help — Show this list',
        ]
        useClaudeStore.setState((s) => ({
          messages: [...s.messages, {
            id: `msg-sys-${Date.now()}`,
            role: 'system' as const,
            content: lines.join('\n'),
            timestamp: Date.now(),
          }],
        }))
        break
      }
    }
  }, [lastResult, resetSession])

  const handleSlashSelect = useCallback((cmd: SlashCommand) => {
    setInput('')
    setSlashFilter(null)
    executeCommand(cmd)
  }, [executeCommand])

  // ─── Send ───
  const handleSend = useCallback(() => {
    if (showSlashMenu) {
      const filtered = getFilteredCommands(slashFilter!)
      if (filtered.length > 0) {
        handleSlashSelect(filtered[slashIndex])
        return
      }
    }
    const trimmed = input.trim()
    if (!trimmed || isRunning) return
    setInput('')
    setSlashFilter(null)
    sendPrompt(trimmed)
  }, [input, isRunning, sendPrompt, showSlashMenu, slashFilter, slashIndex, handleSlashSelect])

  // ─── Keyboard ───
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showSlashMenu) {
        const filtered = getFilteredCommands(slashFilter!)
        if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex((i) => (i + 1) % filtered.length); return }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex((i) => (i - 1 + filtered.length) % filtered.length); return }
        if (e.key === 'Tab') { e.preventDefault(); if (filtered.length > 0) handleSlashSelect(filtered[slashIndex]); return }
        if (e.key === 'Escape') { e.preventDefault(); setSlashFilter(null); return }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend, showSlashMenu, slashFilter, slashIndex, handleSlashSelect]
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)
    updateSlashFilter(value)
  }, [updateSlashFilter])

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
    <div ref={wrapperRef} className="flex-shrink-0 px-3 pb-3 pt-1 relative">
      {/* Slash command menu */}
      <AnimatePresence>
        {showSlashMenu && (
          <SlashCommandMenu
            filter={slashFilter!}
            selectedIndex={slashIndex}
            onSelect={handleSlashSelect}
          />
        )}
      </AnimatePresence>

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
          onChange={handleInputChange}
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

import { useState, useMemo } from 'react'
import {
  Terminal,
  PencilSimple,
  File,
  MagnifyingGlass,
  Globe,
  Gear,
  CaretDown,
  CaretRight,
  CircleNotch,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react'
import type { Message } from '../../stores/claude'

interface Props {
  message: Message
}

const TOOL_ICONS: Record<string, typeof Terminal> = {
  Bash: Terminal,
  Edit: PencilSimple,
  Write: File,
  MultiEdit: PencilSimple,
  Read: File,
  Glob: MagnifyingGlass,
  Grep: MagnifyingGlass,
  WebFetch: Globe,
  WebSearch: Globe,
}

export function ToolCard({ message }: Props) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICONS[message.toolName ?? ''] ?? Gear
  const isRunning = message.toolStatus === 'running'
  const isError = message.toolStatus === 'error'

  const parsedInput = useMemo(() => {
    if (!message.toolInput) return null
    try {
      return JSON.parse(message.toolInput)
    } catch {
      return message.toolInput
    }
  }, [message.toolInput])

  const summary = useMemo(() => {
    if (!parsedInput || typeof parsedInput === 'string') return null
    // Show first relevant field as summary
    if (parsedInput.command) return parsedInput.command
    if (parsedInput.file_path) return parsedInput.file_path
    if (parsedInput.pattern) return parsedInput.pattern
    if (parsedInput.url) return parsedInput.url
    if (parsedInput.query) return parsedInput.query
    return null
  }, [parsedInput])

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-code)]
          hover:bg-[var(--bg-hover)] transition-colors cursor-pointer text-left"
      >
        {/* Status indicator */}
        {isRunning ? (
          <CircleNotch size={14} className="text-[var(--accent)] animate-spin flex-shrink-0" />
        ) : isError ? (
          <XCircle size={14} className="text-red-400 flex-shrink-0" />
        ) : (
          <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
        )}

        <Icon size={14} className="text-[var(--text-muted)] flex-shrink-0" />

        <span className="text-[12px] font-medium text-[var(--text-secondary)] flex-shrink-0">
          {message.toolName}
        </span>

        {summary && (
          <span className="text-[11px] text-[var(--text-muted)] truncate min-w-0 flex-1 font-mono">
            {typeof summary === 'string' ? summary.slice(0, 80) : ''}
          </span>
        )}

        <span className="flex-shrink-0 ml-auto">
          {expanded ? (
            <CaretDown size={12} className="text-[var(--text-muted)]" />
          ) : (
            <CaretRight size={12} className="text-[var(--text-muted)]" />
          )}
        </span>
      </button>

      {expanded && parsedInput && (
        <div className="mx-3 mt-1 mb-1 px-3 py-2 rounded-md bg-[var(--bg-input)] text-[11px] font-mono text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
          {typeof parsedInput === 'string'
            ? parsedInput
            : JSON.stringify(parsedInput, null, 2)}
        </div>
      )}
    </div>
  )
}

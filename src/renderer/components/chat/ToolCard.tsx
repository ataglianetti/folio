import { useState, useMemo } from 'react'
import {
  Terminal,
  PencilSimple,
  FileText,
  MagnifyingGlass,
  Globe,
  Wrench,
  CaretDown,
  CaretRight,
  SpinnerGap,
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
  Write: FileText,
  MultiEdit: PencilSimple,
  Read: FileText,
  Glob: MagnifyingGlass,
  Grep: MagnifyingGlass,
  WebFetch: Globe,
  WebSearch: Globe,
}

export function ToolCard({ message }: Props) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICONS[message.toolName ?? ''] ?? Wrench
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
    if (!parsedInput || typeof parsedInput === 'string') return message.toolName
    if (parsedInput.command) return parsedInput.command
    if (parsedInput.file_path) return parsedInput.file_path
    if (parsedInput.pattern) return parsedInput.pattern
    if (parsedInput.url) return parsedInput.url
    if (parsedInput.query) return parsedInput.query
    return message.toolName
  }, [parsedInput, message.toolName])

  if (!expanded) {
    return (
      <div
        className="flex items-start gap-1 cursor-pointer py-[2px]"
        onClick={() => setExpanded(true)}
      >
        <CaretRight size={10} className="mt-[3px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
          {isRunning && (
            <SpinnerGap size={10} className="inline animate-spin mr-1" style={{ color: 'var(--accent)' }} />
          )}
          {message.toolName}
          {summary !== message.toolName && (
            <span className="font-mono ml-1 opacity-70">
              {typeof summary === 'string' ? summary.slice(0, 60) : ''}
            </span>
          )}
          {!isRunning && !isError && (
            <CheckCircle size={10} weight="fill" className="inline ml-1" style={{ color: 'var(--success)' }} />
          )}
          {isError && (
            <XCircle size={10} weight="fill" className="inline ml-1" style={{ color: 'var(--error)' }} />
          )}
        </span>
      </div>
    )
  }

  return (
    <div className="py-1">
      {/* Collapse header */}
      <div
        className="flex items-center gap-1 cursor-pointer"
        onClick={() => setExpanded(false)}
      >
        <CaretDown size={10} style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          {message.toolName}
        </span>
      </div>

      {/* Timeline detail */}
      <div className="relative pl-6 mt-1">
        {/* Vertical line */}
        <div
          className="absolute top-1 bottom-1"
          style={{ left: 10, width: 1, background: 'var(--surface-primary)' }}
        />

        {/* Node */}
        <div className="relative">
          {/* Timeline dot */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              left: -20,
              top: 1,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: isRunning ? 'var(--tool-running-bg)' : 'var(--bg-surface)',
              border: `1px solid ${isRunning ? 'var(--tool-running-border)' : 'var(--tool-border)'}`,
            }}
          >
            {isRunning ? (
              <SpinnerGap size={10} className="animate-spin" style={{ color: 'var(--accent)' }} />
            ) : (
              <Icon size={10} style={{ color: 'var(--text-tertiary)' }} />
            )}
          </div>

          {/* Content */}
          <div className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {message.toolName}
            </span>
          </div>

          {parsedInput && (
            <pre
              className="mt-1 whitespace-pre-wrap break-all overflow-x-auto"
              style={{
                fontSize: 10,
                lineHeight: 1.4,
                padding: '6px 8px',
                borderRadius: 6,
                background: 'var(--bg-code)',
                color: 'var(--text-secondary)',
                maxHeight: 80,
                border: '1px solid var(--border)',
              }}
            >
              {typeof parsedInput === 'string'
                ? parsedInput
                : JSON.stringify(parsedInput, null, 2)}
            </pre>
          )}

          {!isRunning && (
            <div
              className="mt-1 text-[10px] px-2 py-0.5 rounded-full inline-block"
              style={{
                background: isError ? 'var(--perm-deny-bg)' : 'rgba(122,172,140,0.1)',
                color: isError ? 'var(--error)' : 'var(--success)',
              }}
            >
              {isError ? 'Error' : 'Complete'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

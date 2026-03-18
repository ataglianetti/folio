import { useState } from 'react'
import {
  Terminal, PencilSimple, FileText, MagnifyingGlass, Globe, Wrench,
  FolderOpen, Robot, Question, CaretRight, CaretDown, SpinnerGap,
} from '@phosphor-icons/react'
import type { Message } from '../../stores/claude'

// ─── Tool icon mapping ───

function ToolIcon({ name, size = 10 }: { name: string; size?: number }) {
  const icons: Record<string, React.ReactNode> = {
    Read: <FileText size={size} />,
    Edit: <PencilSimple size={size} />,
    Write: <FileText size={size} />,
    MultiEdit: <PencilSimple size={size} />,
    Bash: <Terminal size={size} />,
    Glob: <FolderOpen size={size} />,
    Grep: <MagnifyingGlass size={size} />,
    WebSearch: <Globe size={size} />,
    WebFetch: <Globe size={size} />,
    Agent: <Robot size={size} />,
    AskUserQuestion: <Question size={size} />,
  }

  return (
    <span className="flex items-center" style={{ color: 'var(--text-tertiary)' }}>
      {icons[name] || <Wrench size={size} />}
    </span>
  )
}

// ─── Tool description ───

function getToolDescription(name: string, input?: string): string {
  if (!input) return name
  try {
    const parsed = JSON.parse(input)
    switch (name) {
      case 'Read': return `Read ${parsed.file_path || parsed.path || 'file'}`
      case 'Edit': return `Edit ${parsed.file_path || 'file'}`
      case 'Write': return `Write ${parsed.file_path || 'file'}`
      case 'Glob': return `Search files: ${parsed.pattern || ''}`
      case 'Grep': return `Search: ${parsed.pattern || ''}`
      case 'Bash': {
        const cmd = parsed.command || ''
        return cmd.length > 60 ? `${cmd.substring(0, 57)}...` : cmd || 'Bash'
      }
      case 'WebSearch': return `Search: ${parsed.query || ''}`
      case 'WebFetch': return `Fetch: ${parsed.url || ''}`
      case 'Agent': return `Agent: ${(parsed.prompt || parsed.description || '').substring(0, 50)}`
      default: return name
    }
  } catch {
    const trimmed = input.trim()
    if (trimmed.length > 60) return `${name}: ${trimmed.substring(0, 57)}...`
    return trimmed ? `${name}: ${trimmed}` : name
  }
}

function toolSummary(tools: Message[]): string {
  if (tools.length === 0) return ''
  const first = tools[0]
  const desc = getToolDescription(first.toolName || 'Tool', first.toolInput)
  if (tools.length === 1) return desc
  return `${desc} and ${tools.length - 1} more tool${tools.length > 2 ? 's' : ''}`
}

// ─── ToolTimeline ───

interface Props {
  tools: Message[]
  skipMotion?: boolean
}

export function ToolTimeline({ tools, skipMotion }: Props) {
  const hasRunning = tools.some((t) => t.toolStatus === 'running')
  const [expanded, setExpanded] = useState(false)

  const isOpen = expanded || hasRunning

  if (isOpen) {
    return (
      <div className="py-1">
        {/* Collapse header */}
        {!hasRunning && (
          <div
            className="flex items-center gap-1 cursor-pointer mb-1.5"
            onClick={() => setExpanded(false)}
          >
            <CaretDown size={10} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Used {tools.length} tool{tools.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Timeline */}
        <div className="relative pl-6">
          {/* Vertical line */}
          <div
            className="absolute left-[10px] top-1 bottom-1 w-px"
            style={{ background: 'var(--surface-primary)' }}
          />

          <div className="space-y-3">
            {tools.map((tool) => {
              const isRunning = tool.toolStatus === 'running'
              const isError = tool.toolStatus === 'error'
              const toolName = tool.toolName || 'Tool'
              const desc = getToolDescription(toolName, tool.toolInput)

              return (
                <div key={tool.id} className="relative">
                  {/* Timeline node */}
                  <div
                    className="absolute -left-6 top-[1px] w-[20px] h-[20px] rounded-full flex items-center justify-center"
                    style={{
                      background: isRunning ? 'var(--tool-running-bg)' : 'var(--bg-surface)',
                      border: `1px solid ${isRunning ? 'var(--tool-running-border)' : 'var(--tool-border)'}`,
                    }}
                  >
                    {isRunning
                      ? <SpinnerGap size={10} className="animate-spin" style={{ color: 'var(--accent)' }} />
                      : <ToolIcon name={toolName} size={10} />
                    }
                  </div>

                  {/* Tool description */}
                  <div className="min-w-0">
                    <span
                      className="text-[12px] leading-[1.4] block truncate"
                      style={{ color: isRunning ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}
                    >
                      {desc}
                    </span>

                    {/* Result badge */}
                    {!isRunning && (
                      <span
                        className="inline-block text-[10px] mt-0.5 px-1.5 py-[1px] rounded"
                        style={{
                          background: isError ? 'var(--perm-deny-bg)' : 'var(--bg-hover)',
                          color: isError ? 'var(--error)' : 'var(--text-tertiary)',
                        }}
                      >
                        {isError ? 'Error' : 'Result'}
                      </span>
                    )}

                    {isRunning && (
                      <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--text-tertiary)' }}>
                        running...
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Collapsed state — summary text + chevron
  return (
    <div
      className="flex items-start gap-1 cursor-pointer py-[2px]"
      onClick={() => setExpanded(true)}
    >
      <CaretRight size={10} className="flex-shrink-0 mt-[2px]" style={{ color: 'var(--text-tertiary)' }} />
      <span className="text-[11px] leading-[1.4]" style={{ color: 'var(--text-tertiary)' }}>
        {toolSummary(tools)}
      </span>
    </div>
  )
}

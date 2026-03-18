import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldWarning, Terminal, PencilSimple, Globe, Wrench } from '@phosphor-icons/react'
import { useClaudeStore, type PermissionRequest } from '../../stores/claude'

interface Props {
  request: PermissionRequest
  queueLength?: number
}

// ─── Sensitive field masking ───

const SENSITIVE_FIELD_RE = /token|password|secret|key|auth|credential|api.?key/i

function formatInput(input?: Record<string, unknown>): string | null {
  if (!input) return null
  const entries = Object.entries(input)
  if (entries.length === 0) return null

  const parts: string[] = []
  for (const [key, value] of entries) {
    if (SENSITIVE_FIELD_RE.test(key)) {
      parts.push(`${key}: ***`)
      continue
    }
    const val = typeof value === 'string' ? value : JSON.stringify(value)
    const truncated = val.length > 120 ? val.substring(0, 117) + '...' : val
    parts.push(`${key}: ${truncated}`)
  }
  return parts.join('\n')
}

// ─── Tool icons ───

const TOOL_ICONS: Record<string, React.ReactNode> = {
  Bash: <Terminal size={14} />,
  Edit: <PencilSimple size={14} />,
  Write: <PencilSimple size={14} />,
  MultiEdit: <PencilSimple size={14} />,
  WebSearch: <Globe size={14} />,
  WebFetch: <Globe size={14} />,
}

function getToolIcon(name: string) {
  return TOOL_ICONS[name] || <Wrench size={14} />
}

// ─── PermissionCard ───

export function PermissionCard({ request, queueLength = 1 }: Props) {
  const respondToPermission = useClaudeStore((s) => s.respondToPermission)
  const [responded, setResponded] = useState(false)

  // Reset responded flag when the displayed permission changes
  useEffect(() => {
    setResponded(false)
  }, [request.questionId])

  const handleOption = (optionId: string) => {
    if (responded) return
    setResponded(true)
    respondToPermission(request.questionId, optionId)
  }

  const inputPreview = formatInput(request.toolInput)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="mx-0 mt-2 mb-2"
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--perm-border)',
          borderRadius: 12,
          boxShadow: 'var(--perm-shadow)',
        }}
        className="overflow-hidden"
      >
        {/* Header */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5"
          style={{
            background: 'var(--perm-header-bg)',
            borderBottom: '1px solid var(--perm-header-border)',
          }}
        >
          <ShieldWarning size={12} weight="fill" style={{ color: 'var(--warning)' }} />
          <span className="text-[11px] font-semibold" style={{ color: 'var(--warning)' }}>
            Permission Required
          </span>
        </div>

        {/* Body */}
        <div className="px-3 py-2.5">
          {/* Tool name + icon */}
          <div className="flex items-center gap-1.5 mb-1">
            <span style={{ color: 'var(--text-tertiary)' }}>{getToolIcon(request.toolName)}</span>
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {request.toolName}
            </span>
          </div>

          {/* Input preview with sensitive field masking */}
          {inputPreview && (
            <pre
              className="text-[10px] leading-[1.4] px-2 py-1.5 rounded-md overflow-x-auto whitespace-pre-wrap break-all mb-2"
              style={{
                background: 'var(--bg-code)',
                color: 'var(--text-secondary)',
                maxHeight: 80,
              }}
            >
              {inputPreview}
            </pre>
          )}

          {/* Action buttons + queue counter */}
          <div className="flex items-center gap-2 flex-wrap">
            {request.options.map((option) => {
              const isAllow = option.id === 'allow' || option.id === 'allow-session'
              const isDeny = option.id === 'deny'

              let bg: string, hoverBg: string, textColor: string, borderColor: string
              if (isAllow) {
                bg = 'var(--perm-allow-bg)'
                hoverBg = 'var(--perm-allow-hover)'
                textColor = 'var(--success)'
                borderColor = 'var(--perm-allow-border)'
              } else if (isDeny) {
                bg = 'var(--perm-deny-bg)'
                hoverBg = 'var(--perm-deny-hover)'
                textColor = 'var(--error)'
                borderColor = 'var(--perm-deny-border)'
              } else {
                bg = 'var(--accent-light)'
                hoverBg = 'var(--accent-soft)'
                textColor = 'var(--accent)'
                borderColor = 'var(--accent-soft)'
              }

              return (
                <button
                  key={option.id}
                  onClick={() => handleOption(option.id)}
                  disabled={responded}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-full cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: bg,
                    color: textColor,
                    border: `1px solid ${borderColor}`,
                  }}
                  onMouseEnter={(e) => { if (!responded) e.currentTarget.style.background = hoverBg }}
                  onMouseLeave={(e) => { if (!responded) e.currentTarget.style.background = bg }}
                >
                  {option.label}
                </button>
              )
            })}

            {queueLength > 1 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                +{queueLength - 1} more
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

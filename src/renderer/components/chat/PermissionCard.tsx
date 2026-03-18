import { motion } from 'framer-motion'
import { ShieldWarning } from '@phosphor-icons/react'
import { useClaudeStore, type PermissionRequest } from '../../stores/claude'

interface Props {
  request: PermissionRequest
}

export function PermissionCard({ request }: Props) {
  const respondToPermission = useClaudeStore((s) => s.respondToPermission)
  const summary = getSummary(request)

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
      >
        {/* Header */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5"
          style={{
            background: 'var(--perm-header-bg)',
            borderBottom: '1px solid var(--perm-header-border)',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <ShieldWarning size={12} weight="fill" style={{ color: 'var(--warning)' }} />
          <span className="text-[11px] font-semibold" style={{ color: 'var(--warning)' }}>
            Permission Required
          </span>
        </div>

        {/* Body */}
        <div className="px-3 py-2.5">
          {/* Tool name */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {request.toolName}
            </span>
          </div>

          {/* Input preview */}
          {summary && (
            <pre
              className="whitespace-pre-wrap break-all overflow-x-auto mb-2"
              style={{
                fontSize: 10,
                lineHeight: 1.4,
                padding: '6px 8px',
                borderRadius: 6,
                background: 'var(--bg-code)',
                color: 'var(--text-secondary)',
                maxHeight: 80,
              }}
            >
              {summary}
            </pre>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {request.options.map((option) => {
              const isAllow = option.id === 'allow' || option.id === 'allow-session'
              const isDeny = option.id === 'deny'

              return (
                <button
                  key={option.id}
                  onClick={() => respondToPermission(request.questionId, option.id)}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                  style={{
                    background: isDeny
                      ? 'var(--perm-deny-bg)'
                      : isAllow
                        ? 'var(--perm-allow-bg)'
                        : 'var(--accent-light)',
                    color: isDeny
                      ? 'var(--error)'
                      : isAllow
                        ? 'var(--success)'
                        : 'var(--accent)',
                    border: `1px solid ${
                      isDeny
                        ? 'var(--perm-deny-border)'
                        : isAllow
                          ? 'var(--perm-allow-border)'
                          : 'var(--accent-soft)'
                    }`,
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget
                    if (isDeny) el.style.background = 'var(--perm-deny-hover)'
                    else if (isAllow) el.style.background = 'var(--perm-allow-hover)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget
                    if (isDeny) el.style.background = 'var(--perm-deny-bg)'
                    else if (isAllow) el.style.background = 'var(--perm-allow-bg)'
                  }}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function getSummary(request: PermissionRequest): string | null {
  const input = request.toolInput
  if (!input) return null
  if (input.command) return String(input.command)
  if (input.file_path) {
    const path = String(input.file_path)
    if (input.old_string !== undefined) return `Edit: ${path}`
    return `Write: ${path}`
  }
  return null
}

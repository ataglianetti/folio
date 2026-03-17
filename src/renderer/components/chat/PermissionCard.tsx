import { Shield } from '@phosphor-icons/react'
import { useClaudeStore, type PermissionRequest } from '../../stores/claude'

interface Props {
  request: PermissionRequest
}

export function PermissionCard({ request }: Props) {
  const respondToPermission = useClaudeStore((s) => s.respondToPermission)

  const summary = getSummary(request)

  return (
    <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-500/20">
        <Shield size={14} weight="fill" className="text-amber-400 flex-shrink-0" />
        <span className="text-[12px] font-medium text-amber-300">
          Permission Required
        </span>
        <span className="text-[11px] text-[var(--text-muted)] ml-auto">
          {request.toolName}
        </span>
      </div>

      {/* Summary */}
      {summary && (
        <div className="px-3 py-2 text-[12px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap max-h-[120px] overflow-y-auto">
          {summary}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-amber-500/20">
        {request.options.map((option) => (
          <button
            key={option.id}
            onClick={() => respondToPermission(request.questionId, option.id)}
            className={`
              px-3 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer
              ${option.id === 'deny'
                ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                : option.id === 'allow'
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  : 'text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function getSummary(request: PermissionRequest): string | null {
  const input = request.toolInput
  if (!input) return null

  if (input.command) return String(input.command)
  if (input.file_path) {
    const path = String(input.file_path)
    if (input.old_string !== undefined) {
      return `Edit: ${path}`
    }
    return `Write: ${path}`
  }
  return null
}

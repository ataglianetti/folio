import { CircleNotch } from '@phosphor-icons/react'
import { useClaudeStore } from '../../stores/claude'

export function StatusBar() {
  const status = useClaudeStore((s) => s.status)
  const currentActivity = useClaudeStore((s) => s.currentActivity)
  const lastResult = useClaudeStore((s) => s.lastResult)
  const sessionId = useClaudeStore((s) => s.sessionId)
  const resetSession = useClaudeStore((s) => s.resetSession)

  const isActive = status === 'running' || status === 'connecting'

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
      {isActive && (
        <>
          <CircleNotch size={11} className="animate-spin text-[var(--accent)]" />
          <span className="truncate">{currentActivity || 'Working...'}</span>
        </>
      )}

      {!isActive && lastResult && (
        <span>
          {lastResult.costUsd !== undefined && `$${lastResult.costUsd.toFixed(4)}`}
          {lastResult.durationMs !== undefined && ` · ${(lastResult.durationMs / 1000).toFixed(1)}s`}
          {lastResult.numTurns !== undefined && ` · ${lastResult.numTurns} turns`}
        </span>
      )}

      {!isActive && !lastResult && sessionId && (
        <span className="truncate">Session active</span>
      )}

      <div className="flex-1" />

      {sessionId && !isActive && (
        <button
          onClick={resetSession}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
        >
          New session
        </button>
      )}
    </div>
  )
}

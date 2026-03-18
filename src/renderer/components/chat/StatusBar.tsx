import { FolderOpen, Terminal } from '@phosphor-icons/react'
import { useClaudeStore } from '../../stores/claude'
import { useVaultStore } from '../../stores/vault'

function compactPath(fullPath: string): string {
  const parts = fullPath.replace(/\/$/, '').split('/')
  return parts[parts.length - 1] || fullPath
}

export function StatusBar() {
  const status = useClaudeStore((s) => s.status)
  const currentActivity = useClaudeStore((s) => s.currentActivity)
  const lastResult = useClaudeStore((s) => s.lastResult)
  const sessionId = useClaudeStore((s) => s.sessionId)
  const resetSession = useClaudeStore((s) => s.resetSession)
  const vaultPath = useVaultStore((s) => s.vaultPath)

  const isActive = status === 'running' || status === 'connecting'

  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: '0 16px 1.5px 16px',
        minHeight: 28,
        fontSize: 11,
        color: 'var(--text-tertiary)',
      }}
    >
      {/* Left — activity or vault path */}
      <div className="flex items-center gap-2 min-w-0">
        {isActive && (
          <>
            <ThinkingDots />
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

        {!isActive && !lastResult && vaultPath && (
          <span className="flex items-center gap-1 truncate">
            <FolderOpen size={11} className="flex-shrink-0" />
            {compactPath(vaultPath)}
          </span>
        )}
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {sessionId && !isActive && (
          <button
            onClick={resetSession}
            className="text-[11px] px-1.5 py-0.5 rounded-full cursor-pointer transition-colors hover:opacity-80"
            style={{ color: 'var(--text-tertiary)' }}
          >
            New session
          </button>
        )}
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 4,
            height: 4,
            background: 'var(--accent)',
            animation: 'bounce-dot 1.2s ease-in-out infinite',
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  )
}

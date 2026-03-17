import { ChevronRight, Circle } from 'lucide-react'
import { useVaultStore } from '../../stores/vault'
import { NOTE_TYPES } from '../../types'

export function TitleBar() {
  const { currentNotePath, isDirty, currentNoteContent } = useVaultStore()

  if (!currentNotePath) return null

  const segments = currentNotePath.replace(/\.md$/, '').split('/')
  const noteType = extractType(currentNoteContent ?? '')
  const typeConfig = noteType ? NOTE_TYPES[noteType] : undefined
  const Icon = typeConfig?.icon

  return (
    <div className="titlebar-no-drag flex items-center h-full px-4 pl-20 bg-[var(--bg-primary)] flex-shrink-0 select-none w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-0.5 text-[12px] min-w-0 flex-1">
        {Icon && (
          <Icon
            size={13}
            className="flex-shrink-0 mr-1"
            style={{ color: typeConfig?.color }}
          />
        )}
        {segments.map((segment, i) => (
          <span key={i} className="flex items-center gap-0.5 min-w-0">
            {i > 0 && (
              <ChevronRight size={10} className="text-[var(--text-muted)] flex-shrink-0 opacity-50" />
            )}
            <span
              className={`truncate ${
                i === segments.length - 1
                  ? 'text-[var(--text-primary)] font-medium'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {segment}
            </span>
          </span>
        ))}
      </div>

      {/* Save indicator */}
      {isDirty && (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <Circle size={6} fill="currentColor" className="text-[var(--accent)]" />
          <span>Edited</span>
        </div>
      )}
    </div>
  )
}

function extractType(content: string): string | null {
  if (!content.startsWith('---')) return null
  const match = content.match(/^type:\s*(.+)$/m)
  return match ? match[1].trim() : null
}

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
    <div
      className="titlebar-no-drag flex items-center h-full pl-20 pr-4 flex-shrink-0 select-none w-full"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex items-center gap-0.5 text-[11px] min-w-0 flex-1">
        {Icon && (
          <Icon size={12} className="flex-shrink-0 mr-1" style={{ color: typeConfig?.color }} />
        )}
        {segments.map((segment, i) => (
          <span key={i} className="flex items-center gap-0.5 min-w-0">
            {i > 0 && (
              <ChevronRight size={9} className="flex-shrink-0 opacity-40" style={{ color: 'var(--text-tertiary)' }} />
            )}
            <span
              className="truncate"
              style={{
                color: i === segments.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: i === segments.length - 1 ? 500 : 400,
              }}
            >
              {segment}
            </span>
          </span>
        ))}
      </div>

      {isDirty && (
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          <Circle size={5} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
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

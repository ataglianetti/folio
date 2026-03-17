import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { NOTE_TYPES } from '../../types'

interface PropertyHeaderProps {
  content: string
}

export function PropertyHeader({ content }: PropertyHeaderProps) {
  const frontmatter = useMemo(() => parseFrontmatter(content), [content])
  const [expanded, setExpanded] = useState(false)

  if (!frontmatter || Object.keys(frontmatter).length === 0) return null

  const noteType = frontmatter.type as string | undefined
  const typeConfig = noteType ? NOTE_TYPES[noteType] : undefined
  const Icon = typeConfig?.icon
  const propertyCount = Object.keys(frontmatter).filter((k) => k !== 'type').length

  return (
    <div className="property-header mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 py-1.5 px-1 -mx-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors cursor-pointer w-full text-left"
      >
        {expanded ? (
          <ChevronDown size={12} className="text-[var(--text-muted)] flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-[var(--text-muted)] flex-shrink-0" />
        )}
        {Icon && typeConfig && (
          <Icon size={14} style={{ color: typeConfig.color }} className="flex-shrink-0" />
        )}
        {typeConfig && (
          <span
            className="text-[11px] font-medium px-1.5 py-px rounded-full tracking-wide uppercase"
            style={{
              backgroundColor: typeConfig.color + '15',
              color: typeConfig.color,
            }}
          >
            {typeConfig.name}
          </span>
        )}
        {!typeConfig && noteType && (
          <span className="text-[11px] font-medium text-[var(--text-muted)]">
            {noteType}
          </span>
        )}
        {propertyCount > 0 && (
          <span className="text-[11px] text-[var(--text-muted)]">
            {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 ml-5 pb-3 mb-3 border-b border-[var(--border)]">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            {Object.entries(frontmatter)
              .filter(([key]) => key !== 'type')
              .map(([key, value]) => (
                <div key={key} className="contents">
                  <span className="text-[var(--text-muted)]">{key}</span>
                  <span className="text-[var(--text-secondary)]">
                    {formatValue(value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function parseFrontmatter(content: string): Record<string, unknown> | null {
  if (!content.startsWith('---')) return null

  const endIdx = content.indexOf('\n---', 3)
  if (endIdx === -1) return null

  const yaml = content.slice(4, endIdx)
  const result: Record<string, unknown> = {}

  for (const line of yaml.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const key = line.slice(0, colonIdx).trim()
    let value: unknown = line.slice(colonIdx + 1).trim()

    if (!key) continue

    if (
      typeof value === 'string' &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = (value as string).slice(1, -1)
    }

    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    }

    result[key] = value
  }

  return result
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'string') {
    return value.replace(/\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g, '$1')
  }
  return String(value)
}

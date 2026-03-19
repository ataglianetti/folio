import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, ChevronDown, Link2, FileText } from 'lucide-react'
import { useVaultStore } from '../../stores/vault'

interface BacklinksSectionProps {
  notePath: string
}

export function BacklinksSection({ notePath }: BacklinksSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const [backlinks, setBacklinks] = useState<string[]>([])
  const openNote = useVaultStore((s) => s.openNote)

  useEffect(() => {
    if (!notePath) {
      setBacklinks([])
      return
    }

    // Extract note name from path for backlink lookup
    const name = notePath.split('/').pop()?.replace('.md', '') ?? ''
    if (!name) return

    window.folio.vault.getBacklinks(name).then(setBacklinks).catch(() => setBacklinks([]))
  }, [notePath])

  const handleClick = useCallback(
    (linkPath: string) => {
      openNote(linkPath)
    },
    [openNote]
  )

  if (backlinks.length === 0) return null

  return (
    <div className="px-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-left cursor-pointer py-1"
      >
        {expanded ? (
          <ChevronDown size={11} style={{ color: 'var(--text-tertiary)' }} />
        ) : (
          <ChevronRight size={11} style={{ color: 'var(--text-tertiary)' }} />
        )}
        <Link2 size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          Backlinks
        </span>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>
          {backlinks.length}
        </span>
      </button>

      {expanded && (
        <div className="mt-1 space-y-0.5">
          {backlinks.map((linkPath) => (
            <button
              key={linkPath}
              onClick={() => handleClick(linkPath)}
              className="w-full text-left px-2 py-1 rounded flex items-center gap-1.5 cursor-pointer transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <FileText size={11} className="flex-shrink-0 opacity-40" />
              <span className="text-[11px] truncate">
                {linkPath.split('/').pop()?.replace('.md', '') || linkPath}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

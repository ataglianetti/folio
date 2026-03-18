import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, FileText } from 'lucide-react'
import { useUIStore } from '../stores/ui'
import { useVaultStore } from '../stores/vault'

export function CommandPalette() {
  const { showCommandPalette, toggleCommandPalette } = useUIStore()
  const { search, searchResults, openNote } = useVaultStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showCommandPalette) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showCommandPalette])

  useEffect(() => {
    if (showCommandPalette) search(query)
  }, [query, showCommandPalette, search])

  useEffect(() => { setSelectedIndex(0) }, [searchResults])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleCommandPalette()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, searchResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (searchResults[selectedIndex]) {
          openNote(searchResults[selectedIndex].path)
          toggleCommandPalette()
        }
      }
    },
    [searchResults, selectedIndex, openNote, toggleCommandPalette]
  )

  if (!showCommandPalette) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={toggleCommandPalette}
      />

      <div
        className="relative w-[480px] max-h-[380px] overflow-hidden"
        style={{
          background: 'var(--popover-bg)',
          border: '1px solid var(--popover-border)',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div
          className="flex items-center gap-2.5 px-4 py-3"
          style={{ borderBottom: '1px solid var(--popover-border)' }}
        >
          <Search size={14} className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-[13px] bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {searchResults.map((result, idx) => (
            <button
              key={result.path}
              onClick={() => {
                openNote(result.path)
                toggleCommandPalette()
              }}
              className="w-full text-left px-3 py-2 mx-1 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors"
              style={{
                width: 'calc(100% - 8px)',
                background: idx === selectedIndex ? 'var(--accent-light)' : 'transparent',
                color: idx === selectedIndex ? 'var(--accent)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => { setSelectedIndex(idx) }}
            >
              <FileText size={13} className="flex-shrink-0 opacity-50" />
              <div className="flex flex-col gap-0 min-w-0">
                <span className="text-[12px] truncate" style={{ color: idx === selectedIndex ? 'var(--text-primary)' : 'var(--text-primary)' }}>
                  {result.title || result.path.split('/').pop()?.replace('.md', '')}
                </span>
                <span className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {result.path}
                </span>
              </div>
            </button>
          ))}
          {query && searchResults.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              No notes found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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
    if (showCommandPalette) {
      search(query)
    }
  }, [query, showCommandPalette, search])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults])

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
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={toggleCommandPalette}
      />

      <div className="relative w-[520px] max-h-[380px] bg-[var(--bg-surface)] backdrop-blur-xl rounded-xl shadow-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border)]">
          <Search size={15} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm bg-transparent outline-none
              text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
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
              className={`
                w-full text-left px-3 py-2 mx-1 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer
                ${idx === selectedIndex ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'}
              `}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <FileText size={14} className="text-[var(--text-muted)] flex-shrink-0" />
              <div className="flex flex-col gap-0 min-w-0">
                <span className="text-sm text-[var(--text-primary)] truncate">
                  {result.title || result.path.split('/').pop()?.replace('.md', '')}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] truncate">
                  {result.path}
                </span>
              </div>
            </button>
          ))}
          {query && searchResults.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No notes found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

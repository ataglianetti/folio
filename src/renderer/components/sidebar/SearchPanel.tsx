import { useState, useCallback } from 'react'
import { Search, FileText } from 'lucide-react'
import { useVaultStore } from '../../stores/vault'

export function SearchPanel() {
  const { search, searchResults, searchQuery, openNote } = useVaultStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value
      setLocalQuery(query)
      search(query)
    },
    [search]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
          }}
        >
          <Search size={12} className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search notes..."
            value={localQuery}
            onChange={handleSearch}
            className="flex-1 text-[12px] bg-transparent outline-none"
            style={{
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => {
              const parent = e.currentTarget.parentElement
              if (parent) parent.style.borderColor = 'var(--input-focus-border)'
            }}
            onBlur={(e) => {
              const parent = e.currentTarget.parentElement
              if (parent) parent.style.borderColor = 'var(--border)'
            }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1">
        {searchResults.map((result) => (
          <button
            key={result.path}
            onClick={() => openNote(result.path)}
            className="w-full text-left px-2.5 py-1.5 rounded-md cursor-pointer flex items-start gap-2 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <FileText size={13} className="flex-shrink-0 mt-0.5 opacity-40" />
            <div className="min-w-0">
              <div className="text-[12px] truncate" style={{ color: 'var(--text-primary)' }}>
                {result.title || result.path.split('/').pop()?.replace('.md', '')}
              </div>
              <div className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                {result.path}
              </div>
            </div>
          </button>
        ))}
        {localQuery && searchResults.length === 0 && (
          <p className="text-[11px] text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
            No results
          </p>
        )}
      </div>
    </div>
  )
}

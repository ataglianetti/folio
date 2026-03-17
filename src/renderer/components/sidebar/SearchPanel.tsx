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
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--bg-input)] border border-[var(--border)] focus-within:border-[var(--accent)] transition-colors">
          <Search size={13} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search notes..."
            value={localQuery}
            onChange={handleSearch}
            className="flex-1 text-[13px] bg-transparent outline-none
              text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1">
        {searchResults.map((result) => (
          <button
            key={result.path}
            onClick={() => openNote(result.path)}
            className="w-full text-left px-2.5 py-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors cursor-pointer flex items-start gap-2"
          >
            <FileText size={14} className="text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[13px] text-[var(--text-primary)] truncate">
                {result.title || result.path.split('/').pop()?.replace('.md', '')}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">
                {result.path}
              </div>
            </div>
          </button>
        ))}
        {localQuery && searchResults.length === 0 && (
          <p className="text-[11px] text-[var(--text-muted)] text-center py-6">
            No results
          </p>
        )}
      </div>
    </div>
  )
}

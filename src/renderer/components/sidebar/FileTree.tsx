import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ChevronRight,
  ChevronDown,
  FileText,
  File,
  Folder,
  FolderOpen,
  Plus,
} from 'lucide-react'
import { useVaultStore } from '../../stores/vault'
import type { FileEntry } from '../../types'

export function FileTree() {
  const { fileTree, currentNotePath, openNote, loadDirectory, expandedPaths, toggleDirectory, createAndOpen } =
    useVaultStore()

  return (
    <div className="file-tree text-[13px] overflow-y-auto h-full py-1">
      {/* Header with + button */}
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)' }}>
          Files
        </span>
        <button
          onClick={createAndOpen}
          className="p-0.5 rounded cursor-pointer transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
          title="New note (Cmd+N)"
        >
          <Plus size={13} />
        </button>
      </div>

      {fileTree.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          currentPath={currentNotePath}
          onOpen={openNote}
          onLoadChildren={loadDirectory}
          expandedPaths={expandedPaths}
          onToggle={toggleDirectory}
        />
      ))}
    </div>
  )
}

interface FileTreeNodeProps {
  entry: FileEntry
  depth: number
  currentPath: string | null
  onOpen: (path: string) => void
  onLoadChildren: (path: string) => Promise<FileEntry[]>
  expandedPaths: Set<string>
  onToggle: (path: string) => void
}

function FileTreeNode({
  entry,
  depth,
  currentPath,
  onOpen,
  onLoadChildren,
  expandedPaths,
  onToggle,
}: FileTreeNodeProps) {
  const [children, setChildren] = useState<FileEntry[] | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameName, setRenameName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isExpanded = expandedPaths.has(entry.path)
  const isActive = currentPath === entry.path
  const renameNote = useVaultStore((s) => s.renameNote)

  const handleClick = useCallback(async () => {
    if (renaming) return
    if (entry.is_directory) {
      onToggle(entry.path)
    } else if (entry.name.endsWith('.md')) {
      onOpen(entry.path)
    }
  }, [entry, onOpen, onToggle, renaming])

  const handleDoubleClick = useCallback(() => {
    if (entry.is_directory) return
    setRenameName(displayName(entry.name))
    setRenaming(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [entry])

  const commitRename = useCallback(() => {
    setRenaming(false)
    const newName = renameName.trim()
    if (!newName || newName === displayName(entry.name)) return

    const ext = entry.name.endsWith('.md') ? '.md' : ''
    const dir = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/') + 1) : ''
    const newPath = dir + newName + ext
    renameNote(entry.path, newPath)
  }, [renameName, entry, renameNote])

  useEffect(() => {
    if (isExpanded && !children && entry.is_directory) {
      onLoadChildren(entry.path).then(setChildren)
    }
  }, [isExpanded, children, entry, onLoadChildren])

  return (
    <div>
      <button
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className="w-full text-left h-7 flex items-center gap-1 mx-1 rounded-[4px] cursor-pointer transition-all duration-150"
        style={{
          paddingLeft: `${depth * 14 + 8}px`,
          width: 'calc(100% - 8px)',
          color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
          background: isActive ? 'var(--accent-light)' : 'transparent',
          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent'
        }}
      >
        {entry.is_directory ? (
          <>
            {isExpanded ? (
              <ChevronDown size={11} className="flex-shrink-0 opacity-50" />
            ) : (
              <ChevronRight size={11} className="flex-shrink-0 opacity-50" />
            )}
            {isExpanded ? (
              <FolderOpen size={13} className="flex-shrink-0 opacity-50" />
            ) : (
              <Folder size={13} className="flex-shrink-0 opacity-50" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <FileIcon name={entry.name} />
          </>
        )}
        {renaming ? (
          <input
            ref={inputRef}
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setRenaming(false)
              e.stopPropagation()
            }}
            onClick={(e) => e.stopPropagation()}
            className="ml-0.5 text-[12px] bg-transparent outline-none flex-1 min-w-0 px-0.5 rounded"
            style={{
              color: 'var(--text-primary)',
              border: '1px solid var(--accent)',
              background: 'var(--bg-input)',
            }}
          />
        ) : (
          <span className="truncate ml-0.5 text-[12px]">{displayName(entry.name)}</span>
        )}
      </button>
      {isExpanded && children && (
        <div>
          {children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              currentPath={currentPath}
              onOpen={onOpen}
              onLoadChildren={onLoadChildren}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FileIcon({ name }: { name: string }) {
  if (name.endsWith('.md')) {
    return <FileText size={13} className="flex-shrink-0 opacity-40" />
  }
  return <File size={13} className="flex-shrink-0 opacity-40" />
}

function displayName(name: string): string {
  if (name.endsWith('.md')) return name.slice(0, -3)
  return name
}

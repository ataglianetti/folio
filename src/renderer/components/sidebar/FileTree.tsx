import { useEffect, useState, useCallback } from 'react'
import {
  ChevronRight,
  ChevronDown,
  FileText,
  File,
  Folder,
  FolderOpen,
} from 'lucide-react'
import { useVaultStore } from '../../stores/vault'
import type { FileEntry } from '../../types'

export function FileTree() {
  const { fileTree, currentNotePath, openNote, loadDirectory, expandedPaths, toggleDirectory } =
    useVaultStore()

  return (
    <div className="file-tree text-[13px] overflow-y-auto h-full py-1">
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
  const isExpanded = expandedPaths.has(entry.path)
  const isActive = currentPath === entry.path

  const handleClick = useCallback(async () => {
    if (entry.is_directory) {
      onToggle(entry.path)
    } else if (entry.name.endsWith('.md')) {
      onOpen(entry.path)
    }
  }, [entry, onOpen, onToggle])

  useEffect(() => {
    if (isExpanded && !children && entry.is_directory) {
      onLoadChildren(entry.path).then(setChildren)
    }
  }, [isExpanded, children, entry, onLoadChildren])

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full text-left py-[3px] flex items-center gap-1 rounded-[4px] mx-1
          hover:bg-[var(--bg-hover)] transition-colors cursor-pointer
          ${isActive ? 'bg-[var(--bg-active)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'}
        `}
        style={{ paddingLeft: `${depth * 14 + 6}px`, width: 'calc(100% - 8px)' }}
      >
        {entry.is_directory ? (
          <>
            {isExpanded ? (
              <ChevronDown size={12} className="flex-shrink-0 opacity-50" />
            ) : (
              <ChevronRight size={12} className="flex-shrink-0 opacity-50" />
            )}
            {isExpanded ? (
              <FolderOpen size={14} className="flex-shrink-0 opacity-60" />
            ) : (
              <Folder size={14} className="flex-shrink-0 opacity-60" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 flex-shrink-0" />
            <FileIcon name={entry.name} />
          </>
        )}
        <span className="truncate ml-0.5">{displayName(entry.name)}</span>
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
    return <FileText size={14} className="flex-shrink-0 opacity-50" />
  }
  return <File size={14} className="flex-shrink-0 opacity-50" />
}

function displayName(name: string): string {
  if (name.endsWith('.md')) {
    return name.slice(0, -3)
  }
  return name
}

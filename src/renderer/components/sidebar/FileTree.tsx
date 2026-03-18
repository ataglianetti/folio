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
        <span className="truncate ml-0.5 text-[12px]">{displayName(entry.name)}</span>
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

import { Files, Search, Settings2, FolderOpen } from 'lucide-react'
import { useUIStore } from '../../stores/ui'
import { useVaultStore } from '../../stores/vault'
import { FileTree } from './FileTree'
import { SearchPanel } from './SearchPanel'
import { ResizeHandle } from './ResizeHandle'
import type { ReactNode } from 'react'

export function Sidebar() {
  const { sidebarPanel, setSidebarPanel, sidebarWidth } = useUIStore()
  const { isOpen, noteCount } = useVaultStore()

  return (
    <div
      className="sidebar relative flex flex-col h-full border-r border-[var(--border)] bg-[var(--bg-sidebar)] flex-shrink-0"
      style={{ width: sidebarWidth }}
    >
      {/* Tab bar */}
      <div className="flex items-center border-b border-[var(--border)] px-1.5 py-1.5 gap-0.5 pt-10">
        <SidebarTab
          active={sidebarPanel === 'files'}
          onClick={() => setSidebarPanel('files')}
          icon={<Files size={14} />}
          label="Files"
        />
        <SidebarTab
          active={sidebarPanel === 'search'}
          onClick={() => setSidebarPanel('search')}
          icon={<Search size={14} />}
          label="Search"
        />
        <SidebarTab
          active={sidebarPanel === 'properties'}
          onClick={() => setSidebarPanel('properties')}
          icon={<Settings2 size={14} />}
          label="Properties"
        />
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {!isOpen ? (
          <EmptyState />
        ) : (
          <>
            {sidebarPanel === 'files' && <FileTree />}
            {sidebarPanel === 'search' && <SearchPanel />}
            {sidebarPanel === 'properties' && <PropertiesPlaceholder />}
          </>
        )}
      </div>

      {/* Status bar */}
      {isOpen && (
        <div className="px-3 py-1.5 text-[11px] text-[var(--text-muted)] border-t border-[var(--border)]">
          {noteCount} notes indexed
        </div>
      )}

      <ResizeHandle />
    </div>
  )
}

function SidebarTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer
        ${active ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <FolderOpen size={32} className="text-[var(--text-muted)] mb-3 opacity-40" />
      <p className="text-[var(--text-muted)] text-sm">No vault open</p>
      <p className="text-[var(--text-muted)] text-[11px] mt-1 leading-relaxed">
        Open a folder to get started
      </p>
    </div>
  )
}

function PropertiesPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <Settings2 size={32} className="text-[var(--text-muted)] mb-3 opacity-40" />
      <p className="text-[var(--text-muted)] text-sm">Properties</p>
      <p className="text-[var(--text-muted)] text-[11px] mt-1">Select a note to view properties</p>
    </div>
  )
}

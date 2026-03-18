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
      className="sidebar relative flex flex-col h-full flex-shrink-0"
      style={{
        width: sidebarWidth,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center gap-0.5 px-2 py-1.5"
        style={{
          paddingTop: 36,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <SidebarTab
          active={sidebarPanel === 'files'}
          onClick={() => setSidebarPanel('files')}
          icon={<Files size={13} />}
          label="Files"
        />
        <SidebarTab
          active={sidebarPanel === 'search'}
          onClick={() => setSidebarPanel('search')}
          icon={<Search size={13} />}
          label="Search"
        />
        <SidebarTab
          active={sidebarPanel === 'properties'}
          onClick={() => setSidebarPanel('properties')}
          icon={<Settings2 size={13} />}
          label="Props"
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
        <div
          className="px-3 py-1.5 text-[11px]"
          style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)' }}
        >
          {noteCount} notes
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
      className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] rounded-full cursor-pointer transition-colors"
      style={{
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        background: active ? 'var(--surface-primary)' : 'transparent',
        border: active ? '1px solid var(--surface-secondary)' : '1px solid transparent',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <FolderOpen size={28} className="mb-3 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
      <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No vault open</p>
      <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>
        Open a folder to get started
      </p>
    </div>
  )
}

function PropertiesPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <Settings2 size={28} className="mb-3 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
      <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Properties</p>
      <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>
        Select a note to view
      </p>
    </div>
  )
}

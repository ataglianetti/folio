import { useCallback, useEffect } from 'react'
import { FolderOpen, Command } from 'lucide-react'
import { Sidebar } from './components/sidebar/Sidebar'
import { FolioEditor } from './components/editor/FolioEditor'
import { TitleBar } from './components/editor/TitleBar'
import { CommandPalette } from './components/CommandPalette'
import { useUIStore } from './stores/ui'
import { useVaultStore } from './stores/vault'

function App() {
  const { toggleCommandPalette } = useUIStore()
  const { openVault, isOpen } = useVaultStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault()
        toggleCommandPalette()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette])

  // Listen for index-complete events
  useEffect(() => {
    const unsub = window.folio.vault.onIndexComplete((count) => {
      useVaultStore.setState({ noteCount: count })
    })
    return unsub
  }, [])

  const handleOpenVault = useCallback(async () => {
    try {
      const selected = await window.folio.vault.selectDirectory()
      if (selected) {
        await openVault(selected)
      }
    } catch (err) {
      console.error('Failed to open vault:', err)
    }
  }, [openVault])

  return (
    <div className="app-container flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Drag region for titlebar */}
        <div className="titlebar-drag h-10 flex-shrink-0 flex items-center">
          {isOpen && <TitleBar />}
        </div>
        <main className="flex-1 overflow-y-auto">
          {isOpen ? (
            <FolioEditor />
          ) : (
            <WelcomeScreen onOpenVault={handleOpenVault} />
          )}
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}

function WelcomeScreen({ onOpenVault }: { onOpenVault: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full select-none">
      <h1 className="text-[42px] font-extralight tracking-tight mb-1 text-[var(--text-primary)]">
        Folio
      </h1>
      <p className="text-[var(--text-muted)] text-sm mb-10">
        Your notes, your files, your AI.
      </p>
      <button
        onClick={onOpenVault}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white
          hover:opacity-90 transition-opacity text-sm font-medium cursor-pointer"
      >
        <FolderOpen size={16} />
        Open Vault
      </button>
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mt-6">
        <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--bg-code)] text-[var(--text-secondary)] font-mono text-[11px]">
          <Command size={10} />P
        </kbd>
        <span>to search notes</span>
      </div>
    </div>
  )
}

export default App

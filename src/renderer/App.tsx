import { useCallback, useEffect } from 'react'
import { FolderOpen, Command } from 'lucide-react'
import { Sidebar } from './components/sidebar/Sidebar'
import { FolioEditor } from './components/editor/FolioEditor'
import { TitleBar } from './components/editor/TitleBar'
import { CommandPalette } from './components/CommandPalette'
import { ChatPanel } from './components/chat/ChatPanel'
import { PopoverLayerProvider } from './components/PopoverLayer'
import { useUIStore } from './stores/ui'
import { useVaultStore } from './stores/vault'
import { useClaudeEvents } from './hooks/useClaudeEvents'
import { applyTheme, watchSystemTheme } from './theme'

function App() {
  const { toggleCommandPalette, chatOpen, chatWidth, toggleChat, setSystemDark } = useUIStore()
  const { openVault, isOpen } = useVaultStore()

  // Subscribe to Claude events
  useClaudeEvents()

  // Apply theme on mount + watch OS preference
  useEffect(() => {
    applyTheme(useUIStore.getState().isDark)
    return watchSystemTheme(setSystemDark)
  }, [setSystemDark])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Cmd+P — command palette
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault()
        toggleCommandPalette()
      }
      // Cmd+Shift+L — toggle chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        toggleChat()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette, toggleChat])

  // Listen for index events
  useEffect(() => {
    const unsubComplete = window.folio.vault.onIndexComplete((count) => {
      useVaultStore.setState({ noteCount: count, indexError: null })
    })
    const unsubError = window.folio.vault.onIndexError((error) => {
      useVaultStore.setState({ indexError: error })
    })
    return () => { unsubComplete(); unsubError() }
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
    <PopoverLayerProvider>
      <div className="app-container flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Drag region for titlebar */}
          <div className="titlebar-drag h-10 flex-shrink-0 flex items-center border-b border-[var(--border)]">
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

        {/* Chat panel */}
        {chatOpen && <ChatPanel style={{ width: chatWidth }} />}

        <CommandPalette />
      </div>
    </PopoverLayerProvider>
  )
}

function WelcomeScreen({ onOpenVault }: { onOpenVault: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full select-none">
      <h1
        className="text-[42px] font-extralight tracking-tight mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        Folio
      </h1>
      <p className="text-[13px] mb-10" style={{ color: 'var(--text-tertiary)' }}>
        Your notes, your files, your AI.
      </p>
      <button
        onClick={onOpenVault}
        className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium cursor-pointer transition-colors"
        style={{
          borderRadius: 9999,
          background: 'var(--accent)',
          color: '#ffffff',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--send-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}
      >
        <FolderOpen size={15} />
        Open Vault
      </button>
      <div className="flex items-center gap-1.5 text-[10px] mt-6" style={{ color: 'var(--text-tertiary)' }}>
        <kbd
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-mono text-[10px]"
          style={{ background: 'var(--surface-primary)', color: 'var(--text-secondary)', border: '1px solid var(--surface-secondary)' }}
        >
          <Command size={9} />P
        </kbd>
        <span>to search notes</span>
      </div>
    </div>
  )
}

export default App

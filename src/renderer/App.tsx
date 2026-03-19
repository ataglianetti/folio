import { useCallback, useEffect } from 'react'
import { FolderOpen, Command } from 'lucide-react'
import { Sidebar } from './components/sidebar/Sidebar'
import { FolioEditor } from './components/editor/FolioEditor'
import { TitleBar } from './components/editor/TitleBar'
import { CommandPalette } from './components/CommandPalette'
import { ChatPanel } from './components/chat/ChatPanel'
import { PropertiesPanel } from './components/properties/PropertiesPanel'
import { PopoverLayerProvider } from './components/PopoverLayer'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastContainer } from './components/Toast'
import { useUIStore } from './stores/ui'
import { useVaultStore } from './stores/vault'
import { useClaudeEvents } from './hooks/useClaudeEvents'
import { applyTheme, watchSystemTheme } from './theme'
import { registerShortcut, initGlobalListener } from './lib/shortcuts'

function App() {
  const { chatOpen, chatWidth, sidebarVisible, propertiesOpen, setSystemDark } = useUIStore()
  const { openVault, isOpen } = useVaultStore()

  // Subscribe to Claude events
  useClaudeEvents()

  // Apply theme on mount + watch OS preference
  useEffect(() => {
    applyTheme(useUIStore.getState().isDark)
    return watchSystemTheme(setSystemDark)
  }, [setSystemDark])

  // Restore persisted state on mount
  useEffect(() => {
    window.folio.vault.getState().then((state: Record<string, unknown>) => {
      const ui = useUIStore.getState()
      if (typeof state.sidebarWidth === 'number') ui.setSidebarWidth(state.sidebarWidth as number)
      if (typeof state.chatWidth === 'number') ui.setChatWidth(state.chatWidth as number)
      if (typeof state.propertiesWidth === 'number') ui.setPropertiesWidth(state.propertiesWidth as number)
      if (typeof state.chatOpen === 'boolean') useUIStore.setState({ chatOpen: state.chatOpen as boolean })
      if (typeof state.propertiesOpen === 'boolean') useUIStore.setState({ propertiesOpen: state.propertiesOpen as boolean })
      if (typeof state.sidebarVisible === 'boolean') useUIStore.setState({ sidebarVisible: state.sidebarVisible as boolean })

      // Auto-open last vault
      if (typeof state.lastVaultPath === 'string') {
        const vault = useVaultStore.getState()
        vault.openVault(state.lastVaultPath as string).then(() => {
          if (typeof state.lastNotePath === 'string') {
            useVaultStore.getState().openNote(state.lastNotePath as string)
          }
        }).catch(() => {
          // Vault may no longer exist — that's fine
        })
      }
    }).catch(() => {})
  }, [])

  // Register all shortcuts and start global listener
  useEffect(() => {
    const { toggleCommandPalette, toggleChat, toggleSidebar, toggleProperties } = useUIStore.getState()
    const { saveNote } = useVaultStore.getState()

    registerShortcut('Mod+K', 'Command palette', toggleCommandPalette)
    registerShortcut('Mod+P', 'Quick open', toggleCommandPalette)
    registerShortcut('Mod+Shift+L', 'Toggle chat', toggleChat)
    registerShortcut('Mod+S', 'Save note', saveNote)
    registerShortcut('Mod+N', 'New note', () => {
      const { createAndOpen } = useVaultStore.getState()
      createAndOpen?.()
    })
    registerShortcut('Mod+B', 'Toggle sidebar', toggleSidebar)
    registerShortcut('Mod+I', 'Toggle properties', toggleProperties)

    return initGlobalListener()
  }, [])

  // Persist state on changes
  useEffect(() => {
    const unsubUI = useUIStore.subscribe((state) => {
      window.folio.vault.saveState({
        sidebarWidth: state.sidebarWidth,
        chatWidth: state.chatWidth,
        propertiesWidth: state.propertiesWidth,
        chatOpen: state.chatOpen,
        propertiesOpen: state.propertiesOpen,
        sidebarVisible: state.sidebarVisible,
      })
    })
    const unsubVault = useVaultStore.subscribe((state) => {
      if (state.vaultPath) {
        window.folio.vault.saveState({
          lastVaultPath: state.vaultPath,
          lastNotePath: state.currentNotePath ?? undefined,
        })
      }
    })
    return () => { unsubUI(); unsubVault() }
  }, [])

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
    <ErrorBoundary>
      <PopoverLayerProvider>
        <div className="app-container flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
          {sidebarVisible && <Sidebar />}

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

          {/* Properties panel */}
          {propertiesOpen && isOpen && <PropertiesPanel />}

          {/* Chat panel */}
          {chatOpen && <ChatPanel style={{ width: chatWidth }} />}

          <CommandPalette />
          <ToastContainer />
        </div>
      </PopoverLayerProvider>
    </ErrorBoundary>
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

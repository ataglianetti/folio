import { motion } from 'framer-motion'
import { Broom, CurrencyDollar, Robot, Info } from '@phosphor-icons/react'

export interface SlashCommand {
  command: string
  description: string
  icon: React.ReactNode
}

const BUILTIN_COMMANDS: SlashCommand[] = [
  { command: '/clear', description: 'Clear conversation history', icon: <Broom size={13} /> },
  { command: '/cost', description: 'Show token usage and cost', icon: <CurrencyDollar size={13} /> },
  { command: '/model', description: 'Show model info', icon: <Robot size={13} /> },
  { command: '/help', description: 'Show available commands', icon: <Info size={13} /> },
]

export function getFilteredCommands(filter: string): SlashCommand[] {
  return BUILTIN_COMMANDS.filter((cmd) =>
    cmd.command.startsWith(filter.toLowerCase())
  )
}

interface Props {
  filter: string
  selectedIndex: number
  onSelect: (cmd: SlashCommand) => void
}

export function SlashCommandMenu({ filter, selectedIndex, onSelect }: Props) {
  const filtered = getFilteredCommands(filter)
  if (filtered.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.12 }}
      className="absolute bottom-full left-0 mb-2 w-64 rounded-xl overflow-hidden"
      style={{
        background: 'var(--popover-bg)',
        border: '1px solid var(--popover-border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
    >
      <div className="py-1">
        {filtered.map((cmd, idx) => (
          <button
            key={cmd.command}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(cmd)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors"
            style={{
              background: idx === selectedIndex ? 'var(--bg-hover)' : 'transparent',
              color: idx === selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            <span style={{ color: 'var(--text-tertiary)' }}>{cmd.icon}</span>
            <span className="text-[12px] font-medium">{cmd.command}</span>
            <span className="text-[11px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>
              {cmd.description}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

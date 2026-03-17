import { MessageList } from './MessageList'
import { InputBar } from './InputBar'
import { StatusBar } from './StatusBar'

interface Props {
  style?: React.CSSProperties
}

export function ChatPanel({ style }: Props) {
  return (
    <div
      className="flex flex-col h-full border-l border-[var(--border)] bg-[var(--bg-primary)]"
      style={style}
    >
      {/* Header */}
      <div className="flex items-center px-3 py-2 border-b border-[var(--border)] flex-shrink-0 pt-10">
        <span className="text-[12px] font-medium text-[var(--text-secondary)]">
          Claude
        </span>
      </div>

      {/* Messages */}
      <MessageList />

      {/* Status */}
      <StatusBar />

      {/* Input */}
      <InputBar />
    </div>
  )
}

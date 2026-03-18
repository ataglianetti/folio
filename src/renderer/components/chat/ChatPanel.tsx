import { MessageList } from './MessageList'
import { InputBar } from './InputBar'
import { StatusBar } from './StatusBar'

interface Props {
  style?: React.CSSProperties
}

export function ChatPanel({ style }: Props) {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        ...style,
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center px-4 flex-shrink-0"
        style={{
          height: 40,
          paddingTop: 28,
          paddingBottom: 8,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          Claude
        </span>
      </div>

      {/* Messages */}
      <MessageList />

      {/* Status (overlaps bottom of messages like clui-cc) */}
      <StatusBar />

      {/* Input */}
      <InputBar />
    </div>
  )
}

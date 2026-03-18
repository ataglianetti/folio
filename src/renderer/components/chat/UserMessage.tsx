import type { Message } from '../../stores/claude'

interface Props {
  message: Message
}

export function UserMessage({ message }: Props) {
  return (
    <div className="flex justify-end py-1.5">
      <div
        className="max-w-[85%] text-[13px] leading-[1.5] whitespace-pre-wrap"
        style={{
          background: 'var(--user-bubble)',
          color: 'var(--user-bubble-text)',
          border: '1px solid var(--user-bubble-border)',
          borderRadius: '14px 14px 4px 14px',
          padding: '3px 12px',
        }}
      >
        {message.content}
      </div>
    </div>
  )
}

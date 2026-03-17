import type { Message } from '../../stores/claude'

interface Props {
  message: Message
}

export function UserMessage({ message }: Props) {
  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-md bg-[var(--accent)] text-white text-[13px] leading-relaxed whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  )
}

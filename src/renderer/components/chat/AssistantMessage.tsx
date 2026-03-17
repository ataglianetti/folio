import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../../stores/claude'

interface Props {
  message: Message
}

export const AssistantMessage = memo(function AssistantMessage({ message }: Props) {
  return (
    <div className="mb-3">
      <div className="text-[13px] leading-relaxed text-[var(--text-primary)] prose-folio">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  )
})

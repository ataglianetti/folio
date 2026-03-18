import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check } from '@phosphor-icons/react'
import type { Message } from '../../stores/claude'

const REMARK_PLUGINS = [remarkGfm]

interface Props {
  message: Message
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] cursor-pointer flex-shrink-0 transition-colors"
      style={{
        background: copied ? 'rgba(122,172,140,0.1)' : 'transparent',
        color: copied ? 'var(--success)' : 'var(--text-tertiary)',
        border: 'none',
      }}
      title="Copy response"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

export const AssistantMessage = memo(function AssistantMessage({ message }: Props) {
  return (
    <div className="group/msg relative py-1">
      <div className="text-[13px] leading-[1.6] prose-cloud min-w-0 max-w-[92%]">
        <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>
          {message.content}
        </ReactMarkdown>
      </div>
      {message.content.trim() && (
        <div className="absolute bottom-0 right-0 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-100">
          <CopyButton text={message.content} />
        </div>
      )}
    </div>
  )
}, (prev, next) => prev.message.content === next.message.content)

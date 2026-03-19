import { X, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { useToastStore, type ToastType } from '../stores/toast'

const ICONS: Record<ToastType, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
}

const COLORS: Record<ToastType, string> = {
  error: 'var(--error)',
  warning: 'var(--warning)',
  info: 'var(--accent)',
  success: 'var(--success)',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[360px]">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type]
        const color = COLORS[toast.type]
        return (
          <div
            key={toast.id}
            className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-[12px] shadow-lg"
            style={{
              background: 'var(--popover-bg)',
              border: `1px solid var(--popover-border)`,
              color: 'var(--text-primary)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <Icon size={14} className="flex-shrink-0 mt-px" style={{ color }} />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-0.5 rounded cursor-pointer transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

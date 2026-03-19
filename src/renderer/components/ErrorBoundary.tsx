import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 px-8 text-center"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          <h1 className="text-xl font-medium">Something went wrong</h1>
          <p className="text-[13px] max-w-md" style={{ color: 'var(--text-secondary)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="px-4 py-2 text-[13px] rounded-lg cursor-pointer transition-colors"
            style={{
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

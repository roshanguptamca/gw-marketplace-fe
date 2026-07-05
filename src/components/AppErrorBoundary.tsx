import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  hasError: boolean
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Marketplace rendering error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page-shell">
          <div className="state-panel">
            <p className="eyebrow">Unexpected error</p>
            <h1>We couldn’t display this page</h1>
            <p>Please refresh the page. If the problem continues, try again later.</p>
            <button className="button" onClick={() => window.location.reload()}>
              Refresh page
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}

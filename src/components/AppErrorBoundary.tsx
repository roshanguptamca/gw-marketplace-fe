import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '../i18n'

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
            <p className="eyebrow">{i18n.t('unexpectedError')}</p>
            <h1>{i18n.t('pageDisplayFailed')}</h1>
            <p>{i18n.t('refreshHint')}</p>
            <button className="button" onClick={() => window.location.reload()}>
              {i18n.t('refreshPage')}
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}

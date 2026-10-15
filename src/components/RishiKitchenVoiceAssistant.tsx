import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getShopLogoUrl, handleShopLogoError } from '../utils/shopImages'

const RISHI_AGENT_ID = 'agent_1901m50br0w0eg8a1m3karz91wdr'
const WIDGET_SCRIPT_ID = 'rishi-elevenlabs-widget-script'
const WIDGET_SCRIPT_URL = 'https://unpkg.com/@elevenlabs/convai-widget-embed'

/** Customers explicitly opt in before the third-party voice widget loads. */
export function RishiKitchenVoiceAssistant({ logoUrl }: { logoUrl?: string }) {
  const avatarUrl = getShopLogoUrl(logoUrl)
  const [enabled, setEnabled] = useState(false)
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [headerHost, setHeaderHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setHeaderHost(document.getElementById('rishi-header-chat'))
  }, [])
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    try {
      return localStorage.getItem('rishi-chat-welcomed') !== 'true'
    } catch {
      return true
    }
  })
  const dismissWelcome = () => {
    setWelcomeOpen(false)
    try {
      localStorage.setItem('rishi-chat-welcomed', 'true')
    } catch {
      // Chat remains usable when browser storage is unavailable.
    }
  }
  const widgetContainer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWidgetOpen(false)
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const container = widgetContainer.current
    if (container && !container.firstChild) {
      const widget = document.createElement('elevenlabs-convai')
      widget.setAttribute('agent-id', RISHI_AGENT_ID)
      widget.setAttribute('variant', 'compact')
      widget.setAttribute('default-expanded', 'true')
      widget.setAttribute('always-expanded', 'true')
      widget.setAttribute('avatar-image-url', avatarUrl)
      widget.setAttribute('action-text', 'Chat with us')
      widget.setAttribute('expand-text', 'Open chat')
      widget.setAttribute('dismissible', 'true')
      container.appendChild(widget)
    }
    if (document.getElementById(WIDGET_SCRIPT_ID)) return
    const script = document.createElement('script')
    script.id = WIDGET_SCRIPT_ID
    script.src = WIDGET_SCRIPT_URL
    script.async = true
    script.type = 'text/javascript'
    document.body.appendChild(script)
  }, [enabled, avatarUrl])

  return (
    <aside aria-label="Rishi Kitchen AI assistant">
      {headerHost &&
        createPortal(
          <button
            className="rishi-header-chat"
            type="button"
            aria-label={
              widgetOpen ? 'Close Rishi Kitchen AI chat' : 'Open Rishi Kitchen AI assistant'
            }
            aria-expanded={widgetOpen}
            aria-controls="rishi-chat-window"
            title="Rishi Kitchen AI assistant"
            onClick={() => {
              dismissWelcome()
              setEnabled(true)
              setWidgetOpen((open) => !open)
            }}
          >
            <img src={avatarUrl} alt="" onError={handleShopLogoError} />
            <span>{widgetOpen ? 'Close chat' : 'AI chat'}</span>
          </button>,
          headerHost,
        )}
      {!enabled && welcomeOpen && (
        <div
          className="rishi-chat-welcome"
          role="region"
          aria-label="Welcome to Rishi Kitchen chat"
        >
          <button
            className="rishi-chat-close"
            type="button"
            aria-label="Close welcome"
            onClick={dismissWelcome}
          >
            ×
          </button>
          <img src={avatarUrl} alt="Rishi Kitchen logo" onError={handleShopLogoError} />
          <strong>Welcome to Rishi Kitchen!</strong>
          <p>How can we help? English · हिंदी · Nederlands</p>
        </div>
      )}
      {!enabled && (
        <button
          className="rishi-chat-launcher"
          type="button"
          aria-label="Open Rishi Kitchen AI chat"
          title="Chat with Rishi Kitchen · powered by ElevenLabs"
          onClick={() => {
            dismissWelcome()
            setEnabled(true)
            setWidgetOpen(true)
          }}
        >
          <img src={avatarUrl} alt="" onError={handleShopLogoError} />
          <span>Chat with us</span>
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 2V11.5a10 10 0 0 1 20 0Z" />
            <path d="M7 11h.01M12 11h.01M17 11h.01" strokeLinecap="round" strokeWidth="3" />
          </svg>
        </button>
      )}
      {enabled && (
        <div
          id="rishi-chat-window"
          hidden={!widgetOpen}
          ref={widgetContainer}
          data-testid="rishi-agent-widget"
        />
      )}
    </aside>
  )
}

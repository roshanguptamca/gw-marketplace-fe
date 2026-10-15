import { useEffect, useRef } from 'react'

const RISHI_AGENT_ID = 'agent_1901m50br0w0eg8a1m3karz91wdr'
const WIDGET_SCRIPT_ID = 'rishi-elevenlabs-widget-script'
const WIDGET_SCRIPT_URL = 'https://unpkg.com/@elevenlabs/convai-widget-embed'

/** Only mount the ElevenLabs assistant for the Rishi Kitchen storefront. */
export function RishiKitchenVoiceAssistant() {
  const widgetContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = widgetContainer.current
    if (container && !container.firstChild) {
      const widget = document.createElement('elevenlabs-convai')
      widget.setAttribute('agent-id', RISHI_AGENT_ID)
      container.appendChild(widget)
    }
    if (document.getElementById(WIDGET_SCRIPT_ID)) return
    const script = document.createElement('script')
    script.id = WIDGET_SCRIPT_ID
    script.src = WIDGET_SCRIPT_URL
    script.async = true
    script.type = 'text/javascript'
    document.body.appendChild(script)
  }, [])

  return (
    <section className="page-shell section" aria-label="Rishi Kitchen AI assistant">
      <h2>Ask Rishi Kitchen AI</h2>
      <p>Ask about our menu, ingredients, prices and pickup. Final orders are placed through checkout.</p>
      <div ref={widgetContainer} />
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'

const RISHI_AGENT_ID = 'agent_1901m50br0w0eg8a1m3karz91wdr'
const WIDGET_SCRIPT_ID = 'rishi-elevenlabs-widget-script'
const WIDGET_SCRIPT_URL = 'https://unpkg.com/@elevenlabs/convai-widget-embed'

/** Customers explicitly opt in before the third-party voice widget loads. */
export function RishiKitchenVoiceAssistant() {
  const [enabled, setEnabled] = useState(false)
  const widgetContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
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
  }, [enabled])

  return (
    <section className="page-shell section" aria-label="Rishi Kitchen AI assistant">
      <h2>Ask Rishi Kitchen AI</h2>
      <p>
        Ask about our menu, ingredients, prices and pickup in English, Hindi or Dutch. Review and
        explicitly confirm any order before it is placed. You can also order through our shop
        checkout.
      </p>
      {!enabled && (
        <>
          <p>
            Starting the assistant loads a service provided by ElevenLabs. Please avoid sharing
            sensitive information in the conversation.
          </p>
          <button className="btn btn-primary" type="button" onClick={() => setEnabled(true)}>
            Start AI Assistant
          </button>
        </>
      )}
      {enabled && <div ref={widgetContainer} data-testid="rishi-agent-widget" />}
    </section>
  )
}

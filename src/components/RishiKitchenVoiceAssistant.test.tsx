import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { RishiKitchenVoiceAssistant } from './RishiKitchenVoiceAssistant'

afterEach(() => {
  document.getElementById('rishi-elevenlabs-widget-script')?.remove()
  localStorage.clear()
})

describe('Rishi Kitchen ElevenLabs widget', () => {
  it('opens from the header after interaction and preserves the widget on close and reopen', () => {
    const view = render(
      <>
        <div id="rishi-header-chat" />
        <RishiKitchenVoiceAssistant />
      </>,
    )
    const headerButton = screen.getByRole('button', { name: 'Open Rishi Kitchen AI assistant' })
    expect(document.getElementById('rishi-elevenlabs-widget-script')).toBeNull()
    fireEvent.click(headerButton)
    const widget = view.container.querySelector('elevenlabs-convai')
    expect(widget).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close Rishi Kitchen AI chat' }))
    expect(screen.getByTestId('rishi-agent-widget')).not.toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Open Rishi Kitchen AI assistant' }))
    expect(view.container.querySelector('elevenlabs-convai')).toBe(widget)
    expect(screen.getByTestId('rishi-agent-widget')).toBeVisible()
  })
  it('welcomes first-time visitors without loading the microphone widget and remembers dismissal', () => {
    const view = render(<RishiKitchenVoiceAssistant />)
    expect(
      screen.getByRole('region', { name: 'Welcome to Rishi Kitchen chat' }),
    ).toBeInTheDocument()
    expect(document.getElementById('rishi-elevenlabs-widget-script')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close welcome' }))
    view.unmount()
    render(<RishiKitchenVoiceAssistant />)
    expect(screen.queryByRole('region', { name: 'Welcome to Rishi Kitchen chat' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Open Rishi Kitchen AI chat' })).toBeInTheDocument()
  })
  it('does not load third-party code until the visitor opts in', () => {
    const { container } = render(<RishiKitchenVoiceAssistant />)
    expect(container.querySelector('elevenlabs-convai')).toBeNull()
    expect(document.getElementById('rishi-elevenlabs-widget-script')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open Rishi Kitchen AI chat' }))
    expect(container.querySelector('elevenlabs-convai')?.getAttribute('agent-id')).toBe(
      'agent_1901m50br0w0eg8a1m3karz91wdr',
    )
    expect(document.querySelectorAll('#rishi-elevenlabs-widget-script')).toHaveLength(1)
  })
})

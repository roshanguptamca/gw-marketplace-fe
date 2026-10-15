import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { RishiKitchenVoiceAssistant } from './RishiKitchenVoiceAssistant'

afterEach(() => {
  document.getElementById('rishi-elevenlabs-widget-script')?.remove()
})

describe('Rishi Kitchen ElevenLabs widget', () => {
  it('does not load third-party code until the visitor opts in', () => {
    const { container } = render(<RishiKitchenVoiceAssistant />)
    expect(container.querySelector('elevenlabs-convai')).toBeNull()
    expect(document.getElementById('rishi-elevenlabs-widget-script')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Start AI Assistant' }))
    expect(container.querySelector('elevenlabs-convai')?.getAttribute('agent-id')).toBe(
      'agent_1901m50br0w0eg8a1m3karz91wdr',
    )
    expect(document.querySelectorAll('#rishi-elevenlabs-widget-script')).toHaveLength(1)
  })
})

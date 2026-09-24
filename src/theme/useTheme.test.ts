import { describe, expect, it } from 'vitest'
import { getInitialTheme } from './useTheme'

describe('theme preference', () => {
  it('uses a stored preference', () => {
    expect(getInitialTheme({ getItem: () => 'light' })).toBe('light')
    expect(getInitialTheme({ getItem: () => 'dark' })).toBe('dark')
  })

  it('defaults to dark when no preference is stored', () => {
    expect(getInitialTheme({ getItem: () => null })).toBe('dark')
  })
})

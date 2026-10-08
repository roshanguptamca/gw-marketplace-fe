import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import i18n from '../i18n'

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('en')
  window.localStorage.clear()
  vi.restoreAllMocks()
})

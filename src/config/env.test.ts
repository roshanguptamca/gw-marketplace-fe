import { describe, expect, it } from 'vitest'
import { createEnvironmentConfig } from './env'

describe('environment URL configuration', () => {
  it('builds independent localhost URLs and seller login return path', () => {
    const config = createEnvironmentConfig({
      VITE_APP_ENV: 'local',
      VITE_API_BASE_URL: 'http://localhost:8000',
      VITE_MAIN_FRONTEND_URL: 'http://localhost:3000',
      VITE_MARKETPLACE_URL: 'http://localhost:3002',
    })

    expect(config.apiBaseUrl).toBe('http://localhost:8000/api')
    expect(config.sellerLoginUrl).toBe(
      'http://localhost:3000/#login?next=http%3A%2F%2Flocalhost%3A3002%2Fseller',
    )
    expect(config.loginUrl).toBe('http://localhost:3000/#login?next=http%3A%2F%2Flocalhost%3A3002')
    expect(config.sellerLoginUrl).not.toContain('guidewisey.com')
    expect(config.sellerSignupUrl).toBe(
      'http://localhost:3000/#signup?next=http%3A%2F%2Flocalhost%3A3002%2Fseller%2Fonboarding&intent=seller',
    )
    expect(config.termsUrl).toBe('http://localhost:3000/#terms')
    expect(config.privacyUrl).toBe('http://localhost:3000/#privacy')
  })

  it('builds production GuideWisey URLs and avoids duplicate API suffixes', () => {
    const config = createEnvironmentConfig({
      VITE_APP_ENV: 'production',
      VITE_API_BASE_URL: 'https://api.guidewisey.com/api/',
      VITE_MAIN_FRONTEND_URL: 'https://www.guidewisey.com/',
      VITE_MARKETPLACE_URL: 'https://marketplace.guidewisey.com/',
    })

    expect(config.apiBaseUrl).toBe('https://api.guidewisey.com/api')
    expect(config.sellerLoginUrl).toBe(
      'https://www.guidewisey.com/#login?next=https%3A%2F%2Fmarketplace.guidewisey.com%2Fseller',
    )
    expect(config.loginUrl).toBe(
      'https://www.guidewisey.com/#login?next=https%3A%2F%2Fmarketplace.guidewisey.com',
    )
    expect(config.sellerSignupUrl).toBe(
      'https://www.guidewisey.com/#signup?next=https%3A%2F%2Fmarketplace.guidewisey.com%2Fseller%2Fonboarding&intent=seller',
    )
    expect(config.termsUrl).toBe('https://www.guidewisey.com/#terms')
    expect(config.privacyUrl).toBe('https://www.guidewisey.com/#privacy')
  })

  it('uses mode-aware defaults and validates mock configuration', () => {
    expect(createEnvironmentConfig({}, true).appEnv).toBe('local')
    expect(createEnvironmentConfig({}, false).appEnv).toBe('production')
    expect(
      createEnvironmentConfig({ VITE_APP_ENV: 'local', VITE_USE_MOCK_API: 'true' }).useMockApi,
    ).toBe(true)
    expect(() => createEnvironmentConfig({ VITE_USE_MOCK_API: 'yes' }, true)).toThrow(
      'VITE_USE_MOCK_API',
    )
  })
})

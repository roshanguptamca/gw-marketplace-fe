export type AppEnvironment = 'local' | 'production'

export interface EnvironmentInput {
  VITE_APP_ENV?: string
  VITE_API_BASE_URL?: string
  VITE_MAIN_FRONTEND_URL?: string
  VITE_MARKETPLACE_URL?: string
  VITE_USE_MOCK_API?: string
}

export interface EnvironmentConfig {
  appEnv: AppEnvironment
  apiBaseUrl: string
  mainFrontendUrl: string
  marketplaceUrl: string
  useMockApi: boolean
  loginUrl: string
  sellerLoginUrl: string
  sellerSignupUrl: string
  termsUrl: string
  privacyUrl: string
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function apiRoot(value: string): string {
  const origin = stripTrailingSlash(value)
  return origin.endsWith('/api') ? origin : `${origin}/api`
}

function parseBoolean(value: string | undefined): boolean {
  if (value === undefined || value === '') return false
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error('VITE_USE_MOCK_API must be "true" or "false"')
}

export function createEnvironmentConfig(
  input: EnvironmentInput,
  developmentMode = false,
): EnvironmentConfig {
  const appEnv: AppEnvironment =
    input.VITE_APP_ENV === 'production' ? 'production' : developmentMode ? 'local' : 'production'
  const local = appEnv === 'local'
  const apiBaseUrl = apiRoot(
    input.VITE_API_BASE_URL ?? (local ? 'http://localhost:8000' : 'https://api.guidewisey.com'),
  )
  const mainFrontendUrl = stripTrailingSlash(
    input.VITE_MAIN_FRONTEND_URL ??
      (local ? 'http://localhost:3000' : 'https://www.guidewisey.com'),
  )
  const marketplaceUrl = stripTrailingSlash(
    input.VITE_MARKETPLACE_URL ??
      (local ? 'http://localhost:3002' : 'https://marketplace.guidewisey.com'),
  )
  const loginBaseUrl = `${mainFrontendUrl}/#login`
  const signupBaseUrl = `${mainFrontendUrl}/#signup`
  const sellerNextUrl = `${marketplaceUrl}/seller`
  const sellerOnboardingNextUrl = `${marketplaceUrl}/seller/onboarding`

  return {
    appEnv,
    apiBaseUrl,
    mainFrontendUrl,
    marketplaceUrl,
    useMockApi: parseBoolean(input.VITE_USE_MOCK_API),
    loginUrl: `${loginBaseUrl}?next=${encodeURIComponent(marketplaceUrl)}`,
    sellerLoginUrl: `${loginBaseUrl}?next=${encodeURIComponent(sellerNextUrl)}`,
    sellerSignupUrl: `${signupBaseUrl}?next=${encodeURIComponent(sellerOnboardingNextUrl)}&intent=seller`,
    termsUrl: `${mainFrontendUrl}/#terms`,
    privacyUrl: `${mainFrontendUrl}/#privacy`,
  }
}

export const env = createEnvironmentConfig(import.meta.env, import.meta.env.DEV)

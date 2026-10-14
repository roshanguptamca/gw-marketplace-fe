import { env } from '../config/env'

// Fired whenever an authenticated-style API call comes back 401/403 —
// signals the session was invalidated (e.g. logged out elsewhere).
export const SESSION_EXPIRED_EVENT = 'marketplace:session-expired'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiFormErrors {
  message: string
  fields: Record<string, string>
}

export interface ApiErrorFallbacks {
  network: string
  server: string
}

function errorText(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(errorText)
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    const preferred = entries.filter(([key]) =>
      ['message', 'detail', 'errors', 'non_field_errors'].includes(key),
    )
    return (preferred.length ? preferred : entries.filter(([key]) => key !== 'code')).flatMap(
      ([, nested]) => errorText(nested),
    )
  }
  return []
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  fallbacks: ApiErrorFallbacks = {
    network: 'A network error occurred. Check your connection and try again.',
    server: 'The service is temporarily unavailable. Please try again later.',
  },
): string {
  if (!(error instanceof ApiError)) return fallback
  if (error.status === 0) return fallbacks.network
  if (error.status >= 500) return fallbacks.server
  return error.message || fallback
}

export function getApiFormErrors(
  error: unknown,
  fallback: string,
  fieldAliases: Record<string, string> = {},
  fallbacks?: ApiErrorFallbacks,
): ApiFormErrors {
  const message = getApiErrorMessage(error, fallback, fallbacks)
  if (!(error instanceof ApiError) || !error.details || error.status === 0 || error.status >= 500) {
    return { message, fields: {} }
  }

  const fields: Record<string, string> = {}
  let generalMessage = ''
  const visit = (value: unknown, key = '') => {
    const fieldName = fieldAliases[key]
    if (fieldName && value && typeof value === 'object') {
      const fieldMessage = errorText(value).join(' ')
      if (fieldMessage) fields[fieldName] = fieldMessage
      return
    }
    if (Array.isArray(value)) {
      value.forEach((nested) => visit(nested, key))
      return
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      const explicitField =
        typeof record.field === 'string'
          ? record.field
          : typeof record.attr === 'string'
            ? record.attr
            : ''
      if (explicitField && fieldAliases[explicitField]) {
        const fieldMessage = errorText(record.message ?? record.detail ?? record.errors).join(' ')
        if (fieldMessage) fields[fieldAliases[explicitField]] = fieldMessage
        return
      }
      for (const [nestedKey, nestedValue] of Object.entries(record)) {
        if (nestedKey === 'code' || nestedKey === 'field' || nestedKey === 'attr') continue
        const fieldName = fieldAliases[nestedKey]
        if (fieldName) {
          const fieldMessage = errorText(nestedValue).join(' ')
          if (fieldMessage) fields[fieldName] = fieldMessage
        } else if (nestedKey === 'errors' && Array.isArray(nestedValue)) {
          visit(nestedValue, nestedKey)
        } else if (['detail', 'message', 'non_field_errors'].includes(nestedKey)) {
          if (!generalMessage) generalMessage = errorText(nestedValue).join(' ')
        } else {
          visit(nestedValue, nestedKey)
        }
      }
      return
    }
    if (typeof value !== 'string') return
    if (fieldName) fields[fieldName] = value
    else if (value && !generalMessage) generalMessage = value
  }
  for (const [key, value] of Object.entries(error.details)) {
    if (key !== 'code') visit(value, key)
  }
  if (!generalMessage) {
    for (const [key, value] of Object.entries(error.details)) {
      if (key === 'code') continue
      const candidate = errorText(value)[0]
      if (candidate && !fieldAliases[key]) {
        generalMessage = candidate
        break
      }
    }
  }
  return {
    message: generalMessage || (Object.keys(fields).length ? fallback : message),
    fields,
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number
  csrf?: boolean
  responseType?: 'json' | 'blob'
}

function getCookie(name: string): string {
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.split('=')[1]
  return match ? decodeURIComponent(match) : ''
}

async function getCsrfToken(fetcher: typeof fetch): Promise<string> {
  const response = await fetcher(`${env.apiBaseUrl}/accounts/csrf/`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new ApiError('Could not initialize a secure request', response.status)
  const body = (await response.json()) as { csrfToken?: string }
  return body.csrfToken ?? getCookie('csrftoken')
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  if (!env.apiBaseUrl) throw new ApiError('Marketplace API URL is not configured', 0)

  const { timeoutMs = 8000, csrf, responseType = 'json', ...requestInit } = options
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const method = (requestInit.method ?? 'GET').toUpperCase()
    const needsCsrf = csrf ?? !['GET', 'HEAD', 'OPTIONS'].includes(method)
    const csrfToken = needsCsrf ? await getCsrfToken(fetcher) : ''
    const response = await fetcher(`${env.apiBaseUrl}${path}`, {
      ...requestInit,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(requestInit.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        ...requestInit.headers,
      },
    })

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`
      let code: string | undefined
      let details: Record<string, unknown> | undefined
      try {
        const body = (await response.json()) as Record<string, unknown>
        details = body
        message = errorText(body)[0] || message
        if (typeof body.code === 'string') code = body.code
        else if (Array.isArray(body.code) && typeof body.code[0] === 'string') code = body.code[0]
      } catch {
        // Keep the status-based message when the response is not JSON.
      }
      // A 401/403 on any authenticated-style call (not the "who am I" probe
      // itself, which is expected to fail when logged out) usually means the
      // session was invalidated elsewhere — e.g. the shopper logged out on
      // the main GuideWisey site in another tab, but this marketplace tab
      // still has a stale "logged in" header from its initial page load.
      // Notify listeners (AuthContext) so the UI can resync immediately.
      if ((response.status === 401 || response.status === 403) && path !== '/auth/me') {
        window.dispatchEvent(
          new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { status: response.status, path } }),
        )
      }
      throw new ApiError(message, response.status, code, details)
    }

    if (response.status === 204) return undefined as T
    if (responseType === 'blob') return (await response.blob()) as T
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408)
    }
    throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0)
  } finally {
    window.clearTimeout(timer)
  }
}

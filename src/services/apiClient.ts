import { env } from '../config/env'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number
  csrf?: boolean
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

  const { timeoutMs = 8000, csrf, ...requestInit } = options
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
      try {
        const body = (await response.json()) as Record<string, unknown>
        if (typeof body.message === 'string') {
          message = body.message
        } else {
          // DRF validation errors look like { "field_name": "text" | ["text"], "code": "..." }.
          // Surface the first field error as a human-readable message.
          const firstFieldError = Object.entries(body).find(([key]) => key !== 'code')?.[1]
          if (typeof firstFieldError === 'string') message = firstFieldError
          else if (Array.isArray(firstFieldError) && typeof firstFieldError[0] === 'string') {
            message = firstFieldError[0]
          }
        }
        if (typeof body.code === 'string') code = body.code
        else if (Array.isArray(body.code) && typeof body.code[0] === 'string') code = body.code[0]
      } catch {
        // Keep the status-based message when the response is not JSON.
      }
      throw new ApiError(message, response.status, code)
    }

    if (response.status === 204) return undefined as T
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

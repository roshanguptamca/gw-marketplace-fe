import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test', useMockApi: false },
}))

import { ApiError, apiRequest, SESSION_EXPIRED_EVENT } from './apiClient'

describe('apiRequest', () => {
  beforeEach(() => vi.useRealTimers())

  it('returns typed JSON and applies headers', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(apiRequest<{ ok: boolean }>('/health', {}, fetcher)).resolves.toEqual({ ok: true })
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.test/health',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
      }),
    )
  })

  it('returns undefined for a no-content response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    await expect(apiRequest('/empty', {}, fetcher)).resolves.toBeUndefined()
  })

  it('initializes CSRF and includes credentials on mutations', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'secure-token' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ saved: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    await apiRequest('/save', { method: 'POST', body: '{}' }, fetcher)
    expect(fetcher).toHaveBeenLastCalledWith(
      'https://api.example.test/save',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ 'X-CSRFToken': 'secure-token' }),
      }),
    )
  })

  it('throws API response messages', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(apiRequest('/private', {}, fetcher)).rejects.toMatchObject({
      message: 'Not allowed',
      status: 403,
    })
  })

  it('falls back to status errors for non-JSON responses', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502 }))
    await expect(apiRequest('/down', {}, fetcher)).rejects.toThrow('Request failed with status 502')
  })

  it('extracts DRF-style field errors and a stable error code', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          customer_email: 'An account already exists with this email.',
          code: 'ACCOUNT_ALREADY_EXISTS',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    await expect(apiRequest('/marketplace/orders/', {}, fetcher)).rejects.toMatchObject({
      message: 'An account already exists with this email.',
      status: 400,
      code: 'ACCOUNT_ALREADY_EXISTS',
    })
  })

  it('extracts the first item of a DRF array-style field error', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ password_confirm: ['Passwords must match.'] }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(apiRequest('/marketplace/orders/', {}, fetcher)).rejects.toMatchObject({
      message: 'Passwords must match.',
      status: 400,
    })
  })

  it('normalizes network and unknown errors', async () => {
    await expect(
      apiRequest('/down', {}, vi.fn().mockRejectedValue(new Error('offline'))),
    ).rejects.toMatchObject({ message: 'offline', status: 0 })
    await expect(apiRequest('/down', {}, vi.fn().mockRejectedValue('bad'))).rejects.toThrow(
      'Network request failed',
    )
  })

  it('times out requests', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn((_url, init: RequestInit | undefined) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        )
      })
    }) as unknown as typeof fetch
    const promise = expect(apiRequest('/slow', { timeoutMs: 10 }, fetcher)).rejects.toEqual(
      new ApiError('Request timed out', 408),
    )
    await vi.advanceTimersByTimeAsync(11)
    await promise
    vi.useRealTimers()
  })

  it('dispatches SESSION_EXPIRED_EVENT on 401/403 from an authenticated call', async () => {
    const handler = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, handler)
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(apiRequest('/buyer/orders/1/cancel/', {}, fetcher)).rejects.toThrow()
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener(SESSION_EXPIRED_EVENT, handler)
  })

  it('does not dispatch SESSION_EXPIRED_EVENT for the /auth/me probe itself', async () => {
    const handler = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, handler)
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Not authenticated' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(apiRequest('/auth/me', {}, fetcher)).rejects.toThrow()
    expect(handler).not.toHaveBeenCalled()
    window.removeEventListener(SESSION_EXPIRED_EVENT, handler)
  })
})

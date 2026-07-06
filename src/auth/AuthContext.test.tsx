import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../services/authService'
import { SESSION_EXPIRED_EVENT } from '../services/apiClient'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../services/authService', () => ({
  authService: { getCurrentUser: vi.fn(), logout: vi.fn() },
}))

const service = vi.mocked(authService)

function Consumer() {
  const { user, loading, logout } = useAuth()
  return (
    <>
      <output>{loading ? 'loading' : (user?.username ?? 'anonymous')}</output>
      <button onClick={() => void logout()}>logout</button>
    </>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    service.getCurrentUser.mockResolvedValue({
      id: 1,
      username: 'seller',
      email: 'seller@example.com',
      first_name: 'Sell',
      last_name: 'Er',
      avatar_url: '',
      is_seller: true,
    })
    service.logout.mockResolvedValue({ message: 'Logged out' })
  })

  it('loads the current user', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )
    expect(await screen.findByText('seller')).toBeInTheDocument()
  })

  it('uses anonymous state when the session request fails', async () => {
    service.getCurrentUser.mockRejectedValueOnce(new Error('unauthorized'))
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )
    expect(await screen.findByText('anonymous')).toBeInTheDocument()
  })

  it('calls the shared logout API', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )
    await screen.findByText('seller')
    await userEvent.click(screen.getByRole('button', { name: 'logout' }))
    await waitFor(() => expect(service.logout).toHaveBeenCalled())
  })

  it('requires its provider', () => {
    expect(() => render(<Consumer />)).toThrow('useAuth must be used within AuthProvider')
  })

  it('clears the cached user and reloads once when a 401/403 signals the session expired elsewhere', async () => {
    window.sessionStorage.clear()
    const reloadSpy = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )
    await screen.findByText('seller')

    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { status: 403, path: '/x' } }))

    await screen.findByText('anonymous')
    expect(reloadSpy).toHaveBeenCalledTimes(1)

    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('does not reload again within the guard window if 403s keep recurring', async () => {
    window.sessionStorage.clear()
    const reloadSpy = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )
    await screen.findByText('seller')

    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { status: 403, path: '/x' } }))
    await screen.findByText('anonymous')
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { status: 403, path: '/y' } }))

    expect(reloadSpy).toHaveBeenCalledTimes(1)

    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })
})

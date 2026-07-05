import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../services/authService'
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
})

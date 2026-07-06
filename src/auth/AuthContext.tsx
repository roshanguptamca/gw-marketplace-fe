import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService } from '../services/authService'
import { SESSION_EXPIRED_EVENT } from '../services/apiClient'
import type { User } from '../types/marketplace'

interface AuthValue {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

export type { AuthValue }

const AuthContext = createContext<AuthValue | null>(null)

export { AuthContext }

// Guards against reload loops: only force a page reload once per short
// window, in case a 403 keeps recurring for an unrelated reason.
const SESSION_EXPIRED_RELOAD_GUARD_KEY = 'mp_session_expired_reload_at'
const SESSION_EXPIRED_RELOAD_GUARD_MS = 15_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void authService
      .getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // If a shopper logged out on the main GuideWisey site (or their session
  // otherwise expired) while this marketplace tab was still open, the header
  // here would keep showing the stale "logged in" state until the next full
  // page load. Any 401/403 from an authenticated API call now dispatches
  // SESSION_EXPIRED_EVENT — react to it by clearing the cached user
  // immediately (header updates right away) and forcing a one-time reload so
  // every part of the page (not just the header) is fully back in sync.
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser((current) => (current ? null : current))
      const lastReloadAt = Number(window.sessionStorage.getItem(SESSION_EXPIRED_RELOAD_GUARD_KEY) || 0)
      const now = Date.now()
      if (now - lastReloadAt > SESSION_EXPIRED_RELOAD_GUARD_MS) {
        window.sessionStorage.setItem(SESSION_EXPIRED_RELOAD_GUARD_KEY, String(now))
        window.location.reload()
      }
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
      window.location.assign('/')
    }
  }, [])

  const value = useMemo(() => ({ user, loading, logout }), [user, loading, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}

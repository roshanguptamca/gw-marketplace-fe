import { useEffect, type ReactNode } from 'react'
import { env } from '../config/env'
import { LoadingState } from '../components/LoadingState'
import { useAuth } from './AuthContext'

/**
 * Guards buyer-only pages (e.g. "My Orders") so unauthenticated shoppers are
 * sent to the main site login, then returned to the exact marketplace route
 * they were trying to reach — never redirected out to a gw-frontend page.
 */
export function ProtectedBuyerRoute({
  children,
  nextPath,
}: {
  children: ReactNode
  nextPath: string
}) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      window.location.assign(env.loginUrlWithNext(nextPath))
    }
  }, [loading, user, nextPath])

  if (loading || !user) {
    return <LoadingState label="Checking your account" />
  }
  return children
}

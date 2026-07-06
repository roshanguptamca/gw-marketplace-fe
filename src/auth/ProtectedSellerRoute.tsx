import { useEffect, type ReactNode } from 'react'
import { env } from '../config/env'
import { LoadingState } from '../components/LoadingState'
import { useAuth } from './AuthContext'

export function ProtectedSellerRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && (!user || !user.is_seller)) {
      window.location.assign(env.sellerLoginUrl)
    }
  }, [loading, user])

  if (loading || !user || !user.is_seller) {
    return <LoadingState label="Checking seller access" />
  }
  return children
}

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { analytics } from './analytics'

export function AnalyticsRouteTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    analytics.pageView(pathname)
  }, [pathname])
  return null
}

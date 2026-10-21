import { useEffect, useState } from 'react'
import { marketplaceService } from '../services/marketplaceService'
import type { PickupSchedule } from '../types/marketplace'

export interface PickupScheduleState {
  schedule: PickupSchedule | null
  loading: boolean
  error: string
}

/**
 * Loads the backend-generated pickup slots for each shop in the cart. Every
 * shop is requested separately with only its own products, so preparation
 * lead times never leak between sellers.
 */
export function usePickupSchedules(
  groups: Array<{ shopSlug: string; productIds: string[]; scheduledMenuId?: number }>,
  reloadKey = 0,
): Record<string, PickupScheduleState> {
  const [schedules, setSchedules] = useState<Record<string, PickupScheduleState>>({})
  const requestKey = JSON.stringify(
    groups
      .map((group) => ({ ...group, productIds: [...group.productIds].sort() }))
      .sort((a, b) => a.shopSlug.localeCompare(b.shopSlug)),
  )

  useEffect(() => {
    let active = true
    const requests = JSON.parse(requestKey) as typeof groups
    setSchedules(() => {
      const next: Record<string, PickupScheduleState> = {}
      requests.forEach(({ shopSlug }) => {
        next[shopSlug] = { schedule: null, loading: true, error: '' }
      })
      return next
    })
    requests.forEach(({ shopSlug, productIds, scheduledMenuId }) => {
      marketplaceService
        .getPickupSchedule(shopSlug, productIds, scheduledMenuId)
        .then((schedule) => {
          if (active) {
            setSchedules((current) => ({
              ...current,
              [shopSlug]: { schedule, loading: false, error: '' },
            }))
          }
        })
        .catch(() => {
          if (active) {
            setSchedules((current) => ({
              ...current,
              [shopSlug]: {
                schedule: null,
                loading: false,
                error: 'Pickup times could not be loaded. Please refresh and try again.',
              },
            }))
          }
        })
    })
    return () => {
      active = false
    }
  }, [requestKey, reloadKey])

  return schedules
}

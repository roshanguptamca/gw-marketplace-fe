import { describe, expect, it } from 'vitest'
import { ORDER_STATUS_TRANSITIONS } from './marketplace'

describe('seller order status options', () => {
  it.each(['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery'])(
    'allows %s to be completed',
    (status) => {
      expect(ORDER_STATUS_TRANSITIONS[status]).toContain('completed')
    },
  )

  it.each(['completed', 'cancelled', 'rejected'])(
    'does not offer further updates for terminal %s orders',
    (status) => {
      expect(ORDER_STATUS_TRANSITIONS[status] ?? []).toEqual([])
    },
  )
})

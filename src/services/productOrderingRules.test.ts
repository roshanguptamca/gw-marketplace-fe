import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config/env', () => ({
  env: { useMockApi: false },
}))
vi.mock('./apiClient', () => ({
  ApiError: class extends Error {},
  apiRequest: vi.fn(),
}))

import { apiRequest } from './apiClient'
import { marketplaceService } from './marketplaceService'

const request = vi.mocked(apiRequest)

const apiProduct = {
  id: 7,
  shop: 1,
  name: 'Samosa',
  slug: 'samosa',
  description: '',
  price: '5.00',
  stock_quantity: 40,
  image_url: '',
  external_image_url: '',
  images: [],
  is_featured: false,
  is_active: true,
  is_approved: true,
  sku: 'SAM-2PC',
  selling_unit: 'PACK',
  units_per_pack: 2,
  weight_value: null,
  weight_unit: null,
  ordering_rules: {
    minimum_order_quantity: null,
    minimum_physical_units: 10,
    minimum_order_amount: '20.00',
    order_lead_time_minutes: 2880,
    order_lead_time_hours: 48,
    effective_minimum_quantity: 5,
  },
}

describe('product ordering rules API mapping', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps selling format and ordering rules from the product API', async () => {
    request.mockResolvedValueOnce(apiProduct)
    await expect(marketplaceService.getProductDetails('test-shop', '7')).resolves.toMatchObject({
      sku: 'SAM-2PC',
      sellingUnit: 'PACK',
      unitsPerPack: 2,
      weightValue: null,
      weightUnit: null,
      orderingRules: {
        minimumOrderQuantity: null,
        minimumPhysicalUnits: 10,
        minimumOrderAmount: 20,
        orderLeadTimeHours: 48,
      },
    })
  })

  it('maps weight products and keeps legacy products unrestricted', async () => {
    request.mockResolvedValueOnce({
      ...apiProduct,
      selling_unit: 'WEIGHT',
      units_per_pack: null,
      weight_value: '250.000',
      weight_unit: 'GRAM',
    })
    await expect(marketplaceService.getProductDetails('test-shop', '7')).resolves.toMatchObject({
      sellingUnit: 'WEIGHT',
      weightValue: 250,
      weightUnit: 'GRAM',
    })

    const legacy: Record<string, unknown> = { ...apiProduct }
    delete legacy.selling_unit
    delete legacy.units_per_pack
    delete legacy.ordering_rules
    request.mockResolvedValueOnce(legacy)
    const product = await marketplaceService.getProductDetails('test-shop', '7')
    expect(product?.sellingUnit ?? 'PIECE').toBe('PIECE')
    expect(product?.orderingRules?.minimumPhysicalUnits ?? null).toBeNull()
  })

  it('requests pickup slots for one shop and only its products', async () => {
    request.mockResolvedValueOnce({
      scheduling_enabled: true,
      timezone: 'Europe/Amsterdam',
      slot_minutes: 30,
      required_lead_time_minutes: 2880,
      required_lead_time_hours: 48,
      earliest_available_pickup: '2026-10-03T14:00:00+02:00',
      days: [],
    })
    await expect(marketplaceService.getPickupSchedule('test-shop', ['7', '8'])).resolves.toEqual({
      schedulingEnabled: true,
      timezone: 'Europe/Amsterdam',
      slotMinutes: 30,
      requiredLeadTimeHours: 48,
      earliestAvailablePickup: '2026-10-03T14:00:00+02:00',
      days: [],
    })
    expect(request).toHaveBeenCalledWith(
      '/marketplace/shops/test-shop/pickup-slots/?product_ids=7%2C8',
    )
  })

  it('sends pickup scheduling settings for sellers', async () => {
    request.mockResolvedValueOnce({})
    await marketplaceService.updateSellerSettings({
      pickupSlotMinutes: 15,
      pickupTimezone: 'Europe/London',
      pickupBookingWindowDays: 7,
    })
    const body = JSON.parse(String(request.mock.calls[0][1]?.body))
    expect(body).toMatchObject({
      pickup_slot_minutes: 15,
      pickup_timezone: 'Europe/London',
      pickup_booking_window_days: 7,
    })
  })
})

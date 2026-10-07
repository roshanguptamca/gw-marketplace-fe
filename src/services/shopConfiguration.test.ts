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

describe('shop configuration API mapping', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not reset order thresholds or delivery fees when updating only billing', async () => {
    request.mockResolvedValueOnce({ legal_business_name: 'Legal Seller', default_vat_rate: '9.00' })
    const result = await marketplaceService.updateSellerSettings({
      legalBusinessName: 'Legal Seller',
      defaultVatRate: '9.00',
    })
    const body = JSON.parse((request.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toEqual({ legal_business_name: 'Legal Seller', default_vat_rate: '9.00' })
    expect(result).toMatchObject({ legalBusinessName: 'Legal Seller', defaultVatRate: '9.00' })
  })

  it('maps public-safe shop settings to storefront and checkout fields', async () => {
    request.mockResolvedValueOnce({
      id: 1,
      slug: 'test-shop',
      name: 'Test Shop',
      description: 'Description',
      email: 'shop@example.com',
      phone: '+31600000000',
      logo_url: '',
      banner_url: '',
      city: 'Town',
      pickup_available: true,
      delivery_available: false,
      settings: {
        min_order_amount: '20.00',
        whatsapp_group_url: 'https://chat.whatsapp.com/TestGroup123',
        pickup_address_line_1: 'Market Lane 7',
        pickup_address_line_2: '',
        pickup_postal_code: '1234 AB',
        pickup_city: 'Town',
        pickup_country: 'NL',
        pickup_instructions: 'Call first',
        delivery_notes: 'Leave at door',
        local_delivery_fee: '5.00',
      },
    })
    await expect(marketplaceService.getShopBySlug('test-shop')).resolves.toMatchObject({
      whatsappGroupUrl: 'https://chat.whatsapp.com/TestGroup123',
      pickupAddress: { addressLine1: 'Market Lane 7', postalCode: '1234 AB' },
      pickupInstructions: 'Call first',
      deliveryInstructions: 'Leave at door',
      contactEmail: 'shop@example.com',
      contactPhone: '+31600000000',
      minimumOrderAmount: '20.00',
      pickupAvailable: true,
      deliveryAvailable: false,
    })
  })

  it('sends optional fulfilment settings through the existing seller settings API', async () => {
    request.mockResolvedValueOnce({
      currency: 'EUR',
      min_order_amount: '0.00',
      delivery_fee: '0.00',
      local_delivery_fee: '5.00',
      international_delivery_fee: '10.00',
      delivery_notes: '',
      order_acceptance_mode: 'manual',
      whatsapp_number: '',
      bank_transfer_instructions: '',
      notification_email: '',
      new_order_email_enabled: true,
      cancellation_request_email_enabled: true,
      low_stock_notification_enabled: false,
    })
    await marketplaceService.updateSellerSettings({
      whatsappGroupUrl: '',
      pickupAddressLine1: 'Market Lane 7',
      pickupCity: 'Town',
      minOrderAmount: '20.00',
      pickupAvailable: true,
    })
    expect(request).toHaveBeenCalledWith(
      '/seller/settings/',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.any(String),
      }),
    )
    const body = JSON.parse((request.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toMatchObject({
      whatsapp_group_url: '',
      pickup_address_line_1: 'Market Lane 7',
      pickup_city: 'Town',
      min_order_amount: '20.00',
      pickup_available: true,
    })
  })
})

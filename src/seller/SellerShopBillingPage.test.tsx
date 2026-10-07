import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { marketplaceService } from '../services/marketplaceService'
import type { ShopSettings } from '../types/marketplace'
import { SellerShopBillingPage } from './SellerShopBillingPage'

vi.mock('../services/marketplaceService', () => ({
  marketplaceService: { getSellerSettings: vi.fn(), updateSellerSettings: vi.fn() },
}))
const service = vi.mocked(marketplaceService)
const settings: ShopSettings = {
  currency: 'EUR',
  minOrderAmount: '25.00',
  deliveryFee: '5.00',
  localDeliveryFee: '5.00',
  internationalDeliveryFee: '10.00',
  deliveryNotes: '',
  orderAcceptanceMode: 'manual',
  whatsappNumber: '',
  bankTransferInstructions: '',
  notificationEmail: '',
  newOrderEmailEnabled: true,
  cancellationRequestEmailEnabled: true,
  lowStockNotificationEnabled: false,
  supportedDeliveryCountries: [],
  legalBusinessName: 'Rishi Kitchen',
  billingAddressLine1: 'Seller Street 1',
  billingPostcode: '1234AB',
  billingCity: 'Town',
  billingCountry: 'NL',
  invoicePrefix: 'RK',
  defaultVatRate: '0.00',
  vatNumber: '1111111111',
  kvkNumber: '',
  invoiceIban: 'ABNAXXXXXXXXX',
}

describe('seller billing settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.getSellerSettings.mockResolvedValue(settings)
    service.updateSellerSettings.mockResolvedValue(settings)
  })

  it('loads legal details and saves only billing fields', async () => {
    render(<SellerShopBillingPage />)
    expect(await screen.findByLabelText('Legal / business name *')).toHaveValue('Rishi Kitchen')
    expect(screen.getByLabelText('VAT / BTW number (optional)')).toHaveValue('1111111111')
    const rate = screen.getByLabelText('Default VAT rate (%) *')
    await userEvent.clear(rate)
    await userEvent.type(rate, '9')
    await userEvent.click(screen.getByRole('button', { name: 'Save billing details' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Billing settings saved')
    expect(service.updateSellerSettings).toHaveBeenCalledWith(
      expect.objectContaining({ defaultVatRate: '9' }),
    )
    expect(service.updateSellerSettings.mock.calls[0][0]).not.toHaveProperty('minOrderAmount')
  })

  it('exposes required legal fields and constrained prefix/rate inputs', async () => {
    render(<SellerShopBillingPage />)
    expect(await screen.findByLabelText('Billing address *')).toBeRequired()
    expect(screen.getByLabelText('KVK number (optional)')).not.toBeRequired()
    expect(screen.getByLabelText('Invoice prefix (optional)')).toHaveAttribute(
      'pattern',
      '[A-Z0-9][A-Z0-9-]{0,19}',
    )
    expect(screen.getByLabelText('Default VAT rate (%) *')).toHaveAttribute('max', '100')
  })

  it('shows save errors without losing edits', async () => {
    service.updateSellerSettings.mockRejectedValueOnce(new Error('Invalid rate'))
    render(<SellerShopBillingPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Save billing details' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid rate')
    expect(screen.getByLabelText('Legal / business name *')).toHaveValue('Rishi Kitchen')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save billing details' })).toBeEnabled(),
    )
  })

  it('allows retry after a load failure', async () => {
    service.getSellerSettings.mockRejectedValueOnce(new Error('Unavailable'))
    render(<SellerShopBillingPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByLabelText('Legal / business name *')).toHaveValue('Rishi Kitchen')
  })
})

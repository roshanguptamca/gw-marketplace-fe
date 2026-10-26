import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import { marketplaceService } from '../services/marketplaceService'
import { SellerOrdersPage } from './SellerOrdersPage'

vi.mock('../hooks/useMarketplaceData', () => ({
  useMarketplaceData: () => ({
    data: [{
      id: 42,
      order_number: 'GW-42',
      customer_name: 'Buyer',
      status: 'ready',
      total: '20.00',
      created_at: '2026-10-26',
    }],
    loading: false,
    error: null,
  }),
}))
vi.mock('../services/marketplaceService', () => ({
  marketplaceService: {
    getSellerOrders: vi.fn(),
    getOrderInvoices: vi.fn(),
    downloadInvoice: vi.fn(),
    resendOrderInvoice: vi.fn(),
    updateSellerOrderStatus: vi.fn(),
    updateSellerManualDiscount: vi.fn(),
  },
}))

const service = vi.mocked(marketplaceService)
const invoice = {
  id: 'invoice-42',
  invoice_number: 'RK-1-2026-000042',
  order: 42,
  order_number: 'GW-42',
  shop: 1,
  shop_name: 'Rishi Kitchen',
  issue_date: '2026-10-26',
  currency: 'EUR',
  total_inc_vat: '20.00',
}

describe('seller invoice download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.getOrderInvoices.mockResolvedValue([invoice])
    service.downloadInvoice.mockResolvedValue()
  })

  it('downloads the latest authorized invoice using the existing PDF service', async () => {
    render(<MemoryRouter><SellerOrdersPage /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Download invoice' }))
    await waitFor(() => {
      expect(service.getOrderInvoices).toHaveBeenCalledWith(42)
      expect(service.downloadInvoice).toHaveBeenCalledWith(invoice)
    })
  })

  it('shows a clear message when there is no invoice yet', async () => {
    service.getOrderInvoices.mockResolvedValue([])
    render(<MemoryRouter><SellerOrdersPage /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Download invoice' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No invoice available')
    expect(service.downloadInvoice).not.toHaveBeenCalled()
  })
})

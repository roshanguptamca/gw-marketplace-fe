import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { marketplaceService } from '../services/marketplaceService'
import type { Invoice } from '../types/marketplace'
import { OrderInvoices } from './OrderInvoices'

vi.mock('../services/marketplaceService', () => ({
  marketplaceService: { getOrderInvoices: vi.fn(), downloadInvoice: vi.fn() },
}))
const service = vi.mocked(marketplaceService)
const invoice: Invoice = {
  id: 'invoice-a',
  invoice_number: 'RK-1-2026-000001',
  order: 1,
  order_number: 'GW1',
  shop: 1,
  shop_name: 'Rishi Kitchen',
  issue_date: '2026-10-07',
  currency: 'EUR',
  total_inc_vat: '10.00',
}

describe('order invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.getOrderInvoices.mockResolvedValue([invoice])
    service.downloadInvoice.mockResolvedValue()
  })

  it('shows invoice details and downloads through the authenticated API service', async () => {
    render(<OrderInvoices orderId={1} />)
    expect(await screen.findByText(invoice.invoice_number)).toBeInTheDocument()
    expect(screen.getByText('Rishi Kitchen')).toBeInTheDocument()
    expect(screen.getByText(/EUR 10.00 incl. VAT/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Download invoice' }))
    expect(service.downloadInvoice).toHaveBeenCalledWith(invoice)
    expect(service.getOrderInvoices).toHaveBeenCalledWith(1)
  })

  it('renders each seller invoice separately', async () => {
    service.getOrderInvoices.mockResolvedValue([
      invoice,
      {
        ...invoice,
        id: 'invoice-b',
        shop: 2,
        shop_name: 'Seller B',
        invoice_number: 'SB-2-2026-000001',
      },
    ])
    render(<OrderInvoices orderId={1} />)
    expect(await screen.findByText('Seller B')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Download invoice' })).toHaveLength(2)
  })

  it('shows loading, empty, and retry states', async () => {
    service.getOrderInvoices
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce([])
    render(<OrderInvoices orderId={1} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading invoices')
    expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No invoices available for this order yet.')).toBeInTheDocument()
  })

  it('reports download failure and allows retry', async () => {
    service.downloadInvoice.mockRejectedValueOnce(new Error('Access denied'))
    render(<OrderInvoices orderId={1} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Download invoice' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Download invoice' })).toBeEnabled(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Download invoice' }))
    expect(service.downloadInvoice).toHaveBeenCalledTimes(2)
  })
})

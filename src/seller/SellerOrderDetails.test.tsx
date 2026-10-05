import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/apiClient'
import { marketplaceService } from '../services/marketplaceService'
import { renderPage } from '../test/renderPage'
import type { SellerOrderDetail } from '../types/marketplace'
import { SellerOrdersPage } from './SellerOrdersPage'

vi.mock('../services/marketplaceService', () => ({
  marketplaceService: {
    getSellerOrders: vi.fn(),
    getSellerOrder: vi.fn(),
    updateSellerOrderStatus: vi.fn(),
  },
}))

const service = vi.mocked(marketplaceService)
const order: SellerOrderDetail = {
  id: 99,
  order_number: 'GW-99',
  shop_name: 'Seller Shop',
  shop_slug: 'seller-shop',
  customer_name: 'Customer Name',
  customer_email: 'customer@example.com',
  customer_phone: '+31612345678',
  delivery_address: 'Delivery Street 12, Amsterdam',
  order_type: 'delivery',
  status: 'pending',
  payment_method: 'cash',
  payment_status: 'unpaid',
  subtotal: '20.00',
  discount_total: '0.00',
  delivery_fee: '5.00',
  total: '25.00',
  customer_note: 'Please call on arrival.',
  seller_note: '',
  items: [
    {
      id: 1,
      product: 1,
      product_name: 'Samosas',
      unit_price: '10.00',
      quantity: 2,
      quantity_description: '2 packs (4 pieces)',
      line_total: '20.00',
    },
  ],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

beforeEach(() => {
  vi.clearAllMocks()
  service.getSellerOrders.mockResolvedValue([])
  service.getSellerOrder.mockResolvedValue(order)
  service.updateSellerOrderStatus.mockResolvedValue({ ...order, status: 'accepted' })
})

describe('selected seller order details', () => {
  it('preserves the orders list without requesting details when no order is selected', async () => {
    service.getSellerOrders.mockResolvedValueOnce([order])
    renderPage(<SellerOrdersPage />, '/seller/orders')
    expect(await screen.findByText('GW-99')).toBeVisible()
    expect(service.getSellerOrder).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Update status for order GW-99' })).toBeVisible()
  })

  it('loads selected order details even if the list request fails', async () => {
    service.getSellerOrders.mockRejectedValueOnce(new Error('List unavailable'))
    renderPage(<SellerOrdersPage />, '/seller/orders?order=99')
    expect(await screen.findByRole('heading', { name: 'Order GW-99' })).toBeVisible()
    expect(await screen.findByText('Orders could not be loaded.')).toBeVisible()
  })

  it('loads older orders directly even when absent from the orders list', async () => {
    renderPage(<SellerOrdersPage />, '/seller/orders?order=99')
    const panel = await screen.findByRole('region', { name: 'Selected order details' })
    await within(panel).findByRole('heading', { name: 'Order GW-99' })

    expect(service.getSellerOrder).toHaveBeenCalledWith('99')
    expect(within(panel).getByText('Customer Name', { exact: false })).toBeVisible()
    expect(within(panel).getByText('customer@example.com', { exact: false })).toBeVisible()
    expect(within(panel).getByText('+31612345678', { exact: false })).toBeVisible()
    expect(within(panel).getByText(/Samosas × 2 \(2 packs \(4 pieces\)\)/)).toBeVisible()
    expect(within(panel).getByText(order.delivery_address, { exact: false })).toBeVisible()
    expect(within(panel).getByText(order.customer_note, { exact: false })).toBeVisible()

    service.getSellerOrder.mockResolvedValueOnce({ ...order, status: 'accepted' })
    await userEvent.selectOptions(
      within(panel).getByRole('combobox', { name: 'Update selected order GW-99' }),
      'accepted',
    )
    await waitFor(() =>
      expect(service.updateSellerOrderStatus).toHaveBeenCalledWith(99, 'accepted'),
    )
    await waitFor(() => expect(service.getSellerOrder).toHaveBeenCalledTimes(2))
  })

  it('renders full pickup snapshot and schedule', async () => {
    service.getSellerOrder.mockResolvedValueOnce({
      ...order,
      order_type: 'pickup',
      pickup_slot_start: '2026-10-06T10:00:00+02:00',
      pickup_slot_end: '2026-10-06T10:30:00+02:00',
      fulfillment_snapshot: {
        pickup_address_line_1: 'Market Lane 7',
        pickup_address_line_2: 'Side entrance',
        pickup_postal_code: '1234 AB',
        pickup_city: 'Amsterdam',
        pickup_country: 'NL',
        pickup_date: '2026-10-06',
        pickup_time: '10:00',
        pickup_instructions: 'Ring the bell.',
      },
    })
    renderPage(<SellerOrdersPage />, '/seller/orders?order=99')
    expect(
      await screen.findByText(/Market Lane 7, Side entrance, 1234 AB, Amsterdam, NL/),
    ).toBeVisible()
    expect(screen.getByText(/2026-10-06 10:00/)).toBeVisible()
    expect(screen.getByText(/2026-10-06T10:00:00\+02:00/)).toBeVisible()
    expect(screen.getByText(/2026-10-06T10:30:00\+02:00/)).toBeVisible()
    expect(screen.getByText(/Ring the bell/)).toBeVisible()
  })

  it.each([500, 404])(
    'shows a safe failure for API status %s without exposing order content',
    async (status) => {
      service.getSellerOrder.mockRejectedValueOnce(new ApiError('Private server detail', status))
      renderPage(<SellerOrdersPage />, '/seller/orders?order=99')
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The selected order could not be loaded, or it does not belong to your shop.',
      )
      expect(screen.queryByText(/Private server detail/)).not.toBeInTheDocument()
      expect(screen.queryByText(/customer@example.com/)).not.toBeInTheDocument()
    },
  )

  it('does not truncate long item names, delivery address or customer note', async () => {
    const longName = `Product ${'item details '.repeat(120)}END ITEM`
    const longAddress = `Address ${'delivery details '.repeat(120)}END ADDRESS`
    const longNote = `Note ${'customer details '.repeat(120)}END NOTE`
    service.getSellerOrder.mockResolvedValueOnce({
      ...order,
      items: [{ ...order.items[0], product_name: longName }],
      delivery_address: longAddress,
      customer_note: longNote,
    })
    renderPage(<SellerOrdersPage />, '/seller/orders?order=99')
    const panel = await screen.findByRole('region', { name: 'Selected order details' })
    expect(panel.textContent).toContain(longName)
    expect(panel.textContent).toContain(longAddress)
    expect(panel.textContent).toContain(longNote)
  })
})

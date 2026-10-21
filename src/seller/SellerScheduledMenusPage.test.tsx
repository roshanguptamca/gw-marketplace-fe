import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SellerScheduledMenusPage } from './SellerScheduledMenusPage'
import { marketplaceService } from '../services/marketplaceService'
import type { ScheduledMenu, SellerProduct } from '../types/marketplace'
import i18n from '../i18n'
vi.mock('../services/marketplaceService', () => ({
  marketplaceService: {
    getSellerScheduledMenus: vi.fn(),
    getSellerProducts: vi.fn(),
    getSellerSettings: vi.fn(),
    createScheduledMenu: vi.fn(),
    updateScheduledMenu: vi.fn(),
    getMenuPreparation: vi.fn(),
  },
}))
const service = vi.mocked(marketplaceService)
const menu: ScheduledMenu = {
  id: 7,
  title: 'Friday special',
  description: 'Fresh snacks',
  products: [1],
  pickup_date: '2026-10-23',
  pickup_start: '16:00:00',
  pickup_end: '19:00:00',
  order_deadline: '2026-10-22T18:00:00Z',
  slot_minutes: 30,
  capacity: 40,
  slot_capacity: 10,
  active: true,
  remaining_capacity: 35,
  timezone: 'Europe/Amsterdam',
  is_open: true,
}
describe('seller scheduled menus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    void i18n.changeLanguage('en')
    service.getSellerScheduledMenus.mockResolvedValue([menu])
    service.getSellerProducts.mockResolvedValue([
      { id: 1, name: 'Vada Pav', is_active: true, is_approved: true } as SellerProduct,
    ])
    service.getSellerSettings.mockResolvedValue({ pickupTimezone: 'Europe/Amsterdam' } as Awaited<
      ReturnType<typeof service.getSellerSettings>
    >)
    service.createScheduledMenu.mockResolvedValue(menu)
    service.updateScheduledMenu.mockResolvedValue(menu)
  })
  it('creates a dated menu with products, capacity, pickup slots and deadline', async () => {
    render(<SellerScheduledMenusPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Create menu' }))
    await userEvent.type(screen.getByLabelText('Menu name'), 'Weekend batch')
    await userEvent.type(screen.getByLabelText('Pickup date'), '2026-10-24')
    await userEvent.type(screen.getByLabelText('Order by'), '2026-10-23T20:00')
    await userEvent.click(await screen.findByLabelText('Vada Pav'))
    await userEvent.click(screen.getByLabelText('Publish this menu'))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(service.createScheduledMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Weekend batch',
          products: [1],
          pickup_date: '2026-10-24',
          order_deadline: '2026-10-23T20:00',
          capacity: 40,
          slot_capacity: 10,
          active: true,
        }),
      ),
    )
  })
  it('shows confirmed quantities and pending quantities separately with a pickup list', async () => {
    service.getMenuPreparation.mockResolvedValue({
      menu,
      confirmed_quantities: [
        {
          product_name: 'Vada Pav',
          sku: 'VADA',
          quantity: 8,
          selling_unit: 'PACK',
          physical_quantity: 16,
          units_per_pack: 2,
          weight_value: null,
          weight_unit: '',
          total_weight_value: null,
        },
      ],
      pending_quantities: [],
      pickups: [
        {
          order_number: 'GW123',
          customer_name: 'Customer A',
          pickup_slot_start: '2026-10-23T14:00:00Z',
          pickup_slot_end: '2026-10-23T14:30:00Z',
          status: 'accepted',
          payment_status: 'unpaid',
          items: [{ product_name: 'Vada Pav', quantity: 8, sku: 'VADA' }],
        },
      ],
    })
    render(<SellerScheduledMenusPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Preparation & pickups' }))
    expect(
      await screen.findByRole('heading', { name: 'Confirmed preparation' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Customer A')).toBeInTheDocument()
    expect(screen.getByText('16')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export preparation CSV' })).toBeInTheDocument()
  })
  it('can pause a menu without changing the booked schedule', async () => {
    render(<SellerScheduledMenusPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Pause menu' }))
    await waitFor(() =>
      expect(service.updateScheduledMenu).toHaveBeenCalledWith(7, { active: false }),
    )
  })
})

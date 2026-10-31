import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScheduledMenus } from './ScheduledMenus'
import { marketplaceService } from '../services/marketplaceService'
import { CartProvider } from '../cart/CartContext'
import { productFixture } from '../test/fixtures'
import i18n from '../i18n'
vi.mock('../services/marketplaceService', () => ({
  marketplaceService: { getScheduledMenus: vi.fn() },
}))
const service = vi.mocked(marketplaceService)
describe('public scheduled menus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    void i18n.changeLanguage('en')
  })
  it('adds the selected product with its menu context and preserves it in the cart', async () => {
    service.getScheduledMenus.mockResolvedValue([
      {
        id: 7,
        title: 'Friday special',
        products: [1],
        pickup_date: '2026-10-23',
        pickup_start: '16:00',
        pickup_end: '19:00',
        order_deadline: '2026-10-22T18:00:00Z',
        slot_minutes: 30,
        capacity: 40,
        slot_capacity: 10,
        active: true,
        description: '',
        remaining_capacity: 35,
        timezone: 'Europe/Amsterdam',
        is_open: true,
      },
    ])
    render(
      <MemoryRouter>
        <CartProvider>
          <ScheduledMenus slug="test-shop" products={[{ ...productFixture, id: '1' }]} />
        </CartProvider>
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Choose menu products' }))
    await userEvent.click(screen.getByRole('button', { name: /Add to cart: Test Product/i }))
    expect(
      JSON.parse(localStorage.getItem('guidewisey-marketplace-cart') || '{}').items[0].product
        .scheduledMenuId,
    ).toBe(7)
  })
})

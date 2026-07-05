import { describe, expect, it, vi } from 'vitest'

vi.mock('../config/env', () => ({
  env: { apiBaseUrl: '', useMockApi: true },
}))

import { marketplaceService } from './marketplaceService'

describe('marketplace service mock mode', () => {
  it('provides shops and resolves them by slug', async () => {
    const shops = await marketplaceService.getShops()
    expect(shops.length).toBeGreaterThan(0)
    await expect(marketplaceService.getShopBySlug('rishikitchen')).resolves.toMatchObject({
      slug: 'rishikitchen',
    })
    await expect(marketplaceService.getShopBySlug('missing')).resolves.toBeNull()
  })

  it('provides shop products and product details', async () => {
    const products = await marketplaceService.getShopProducts('rishikitchen')
    expect(products.every((product) => product.shopSlug === 'rishikitchen')).toBe(true)
    await expect(
      marketplaceService.getProductDetails('rishikitchen', products[0].id),
    ).resolves.toEqual(products[0])
    await expect(
      marketplaceService.getProductDetails('rishikitchen', 'missing'),
    ).resolves.toBeNull()
  })

  it('exposes typed cart operations in mock mode', async () => {
    await expect(marketplaceService.getCart()).resolves.toEqual({ items: [] })
    await expect(marketplaceService.addCartItem('one', 1)).resolves.toEqual({ items: [] })
    await expect(marketplaceService.updateCartItem('one', 2)).resolves.toEqual({ items: [] })
    await expect(marketplaceService.removeCartItem('one')).resolves.toEqual({ items: [] })
  })

  it('exposes seller portal operations through the authenticated API boundary', async () => {
    await expect(marketplaceService.getSellerDashboard()).rejects.toThrow()
    await expect(marketplaceService.getSellerProducts()).rejects.toThrow()
    await expect(marketplaceService.getSellerOrders()).rejects.toThrow()
    await expect(marketplaceService.getSellerShop()).rejects.toThrow()
    await expect(marketplaceService.updateSellerShop({ name: 'Shop' })).rejects.toThrow()
    await expect(marketplaceService.updateSellerProduct(1, { name: 'Product' })).rejects.toThrow()
    await expect(marketplaceService.deleteSellerProduct(1)).rejects.toThrow()
  })

  it('creates a local order confirmation only when mocks are explicitly enabled', async () => {
    await expect(
      marketplaceService.createOrderRequest({
        shop_id: 1,
        customer_name: 'Buyer',
        customer_email: 'buyer@example.com',
        customer_phone: '+31612345678',
        delivery_address: '',
        order_type: 'pickup',
        customer_note: '',
        payment_method: 'cash',
        terms_accepted: true,
        items: [{ product_id: 1, quantity: 1 }],
      }),
    ).resolves.toMatchObject({
      shop_name: "Rishi's Kitchen",
      status: 'pending',
    })
  })
})

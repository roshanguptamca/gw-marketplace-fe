import { describe, expect, it } from 'vitest'
import { formatPrice, shopBasePath, shopPath } from './shopLinks'

describe('shop links', () => {
  it('uses root-relative links on the matching shop host', () => {
    expect(shopBasePath('demo', 'demo.localhost')).toBe('')
    expect(shopBasePath('demo', 'demo.shop.guidewisey.com')).toBe('')
    expect(shopPath('demo', '/products', 'demo.localhost')).toBe('/products')
  })

  it('uses path fallback elsewhere', () => {
    expect(shopBasePath('demo', 'localhost')).toBe('/shop/demo')
    expect(shopPath('demo', '', 'localhost')).toBe('/shop/demo/')
  })

  it('formats prices', () => {
    expect(formatPrice(12.5, 'EUR')).toContain('12.50')
  })
})

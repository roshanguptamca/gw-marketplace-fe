import { describe, expect, it } from 'vitest'
import {
  getShopSlugFromHostname,
  getShopSlugFromPath,
  isShopHostname,
  resolveShopSlug,
} from './shopResolver'

describe('shop resolution', () => {
  it.each([
    ['rishikitchen.shop.guidewisey.com', 'rishikitchen'],
    ['RISHIKITCHEN.shop.guidewisey.com.', 'rishikitchen'],
    ['rishikitchen.localhost', 'rishikitchen'],
    ['rishikitchen.localhost:3002', 'rishikitchen'],
    ['my-good-shop.localhost', 'my-good-shop'],
  ])('resolves %s to %s', (hostname, expected) => {
    expect(getShopSlugFromHostname(hostname)).toBe(expected)
  })

  it.each([
    'localhost',
    'market.guidewisey.com',
    'shop.guidewisey.com',
    'shop.localhost',
    'www.localhost',
    'bad_slug.localhost',
    'a.b.shop.guidewisey.com',
    'rishi.example.com',
  ])('rejects unsupported hostname %s', (hostname) => {
    expect(getShopSlugFromHostname(hostname)).toBeNull()
    expect(isShopHostname(hostname)).toBe(false)
  })

  it('resolves and validates path fallbacks', () => {
    expect(getShopSlugFromPath('/shop/rishikitchen')).toBe('rishikitchen')
    expect(getShopSlugFromPath('/SHOP/demo/products')).toBe('demo')
    expect(getShopSlugFromPath('/shop/my%2Dshop')).toBe('my-shop')
    expect(getShopSlugFromPath('/products')).toBeNull()
    expect(getShopSlugFromPath('/shop/bad_slug')).toBeNull()
    expect(getShopSlugFromPath('/shop/%E0%A4%A')).toBeNull()
  })

  it('prioritizes a valid hostname over the fallback path', () => {
    expect(resolveShopSlug('demo.localhost', '/shop/rishikitchen')).toBe('demo')
    expect(resolveShopSlug('localhost', '/shop/rishikitchen')).toBe('rishikitchen')
    expect(isShopHostname('demo.localhost')).toBe(true)
  })
})

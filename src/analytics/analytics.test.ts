import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizePagePath } from './analytics'

describe('GA4 analytics', () => {
  beforeEach(() => {
    vi.resetModules()
    document.head
      .querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')
      .forEach((script) => script.remove())
    delete window.gtag
    delete window.dataLayer
  })
  afterEach(() => {
    vi.doUnmock('../config/env')
  })

  it('omits queries, hashes and dynamic order/product/shop identifiers', () => {
    expect(
      sanitizePagePath('/shop/rishi-kitchen/products/42?email=private@example.com#token'),
    ).toBe('/shop/:shop/products/:product')
    expect(sanitizePagePath('/account/orders/123?token=secret')).toBe('/account/orders/:order')
    expect(sanitizePagePath('/some/private/path?session=secret')).toBe('/other')
  })

  it('initializes once, tracks initial and SPA page views without duplicate route events', async () => {
    vi.doMock('../config/env', () => ({ env: { gaMeasurementId: 'G-8RD04CNBFV' } }))
    const { analytics } = await import('./analytics')
    analytics.pageView('/')
    analytics.pageView('/')
    analytics.pageView('/shop/one?email=buyer@example.com')
    analytics.pageView('/shop/two')
    analytics.pageView('/checkout?token=secret')
    expect(
      document.head.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]'),
    ).toHaveLength(1)
    expect(window.dataLayer?.filter(([type]) => type === 'config')).toHaveLength(1)
    const pageViews =
      window.dataLayer?.filter(([type, name]) => type === 'event' && name === 'page_view') ?? []
    expect(pageViews).toHaveLength(4)
    expect(pageViews[1][2]).toMatchObject({
      page_path: '/shop/:shop',
      page_location: `${window.location.origin}/shop/:shop`,
    })
    expect(JSON.stringify(window.dataLayer)).not.toContain('buyer@example.com')
    expect(JSON.stringify(window.dataLayer)).not.toContain('token=secret')
    expect(
      window.dataLayer?.filter(([type, name]) => type === 'event' && name === 'begin_checkout'),
    ).toHaveLength(1)
  })

  it('sends only allowlisted commerce parameters and no PII', async () => {
    vi.doMock('../config/env', () => ({ env: { gaMeasurementId: 'G-8RD04CNBFV' } }))
    const { analytics } = await import('./analytics')
    analytics.event('add_to_cart', {
      item_id: '42',
      currency: 'EUR',
      value: 12.5,
      items: [{ item_id: '42', quantity: 1, price: 12.5 }],
      email: 'buyer@example.com',
    } as Parameters<typeof analytics.event>[1])
    const event = window.dataLayer?.find(
      ([type, name]) => type === 'event' && name === 'add_to_cart',
    )
    expect(event?.[2]).toMatchObject({ item_id: '42', currency: 'EUR', value: 12.5 })
    expect(JSON.stringify(event)).not.toContain('buyer@example.com')
    expect(event?.[2]).toMatchObject({
      page_location: `${window.location.origin}/`,
      page_referrer: '',
    })
  })

  it('does not load GA or send events without configuration', async () => {
    vi.doMock('../config/env', () => ({ env: { gaMeasurementId: '' } }))
    const { analytics } = await import('./analytics')
    analytics.pageView('/')
    analytics.event('search')
    expect(window.dataLayer).toBeUndefined()
    expect(document.head.querySelector('script[src*="googletagmanager.com"]')).toBeNull()
  })
})

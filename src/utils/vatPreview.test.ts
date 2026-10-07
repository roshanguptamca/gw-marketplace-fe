import { describe, expect, it } from 'vitest'
import { mockProducts, mockShops } from '../data/mockData'
import { vatPreview } from './vatPreview'

describe('inclusive VAT preview', () => {
  const product = {
    ...mockProducts[0],
    shopSlug: 'vat-shop',
    price: 10,
    priceAmount: '10.00',
    vatRate: '9.00',
  }
  const shops = { 'vat-shop': { ...mockShops[0], defaultVatRate: '9.00' } }

  it('extracts VAT without increasing gross prices', () => {
    expect(vatPreview([{ product, quantity: 2 }], shops)).toEqual({ net: '18.35', vat: '1.65' })
  })

  it('handles mixed rates and shipping using the invoice line-rounding convention', () => {
    expect(
      vatPreview(
        [
          { product, quantity: 1 },
          { product: { ...product, priceAmount: '12.10', vatRate: '21.00' }, quantity: 1 },
        ],
        shops,
        [{ shopSlug: 'vat-shop', amount: '2.50' }],
      ),
    ).toEqual({ net: '21.46', vat: '3.14' })
  })

  it('uses shop configuration for older carts without rate metadata', () => {
    expect(
      vatPreview([{ product: { ...product, vatRate: undefined }, quantity: 1 }], shops),
    ).toEqual({ net: '9.17', vat: '0.83' })
  })

  it('does not invent rates when configuration is missing or invalid', () => {
    expect(
      vatPreview([{ product: { ...product, vatRate: undefined }, quantity: 1 }], {}),
    ).toBeNull()
    expect(
      vatPreview([{ product: { ...product, vatRate: '101.00' }, quantity: 1 }], shops),
    ).toBeNull()
  })

  it('handles zero rates and half-cent rounding with integer arithmetic', () => {
    expect(
      vatPreview(
        [{ product: { ...product, priceAmount: '0.03', vatRate: '20.00' }, quantity: 1 }],
        shops,
      ),
    ).toEqual({ net: '0.03', vat: '0.00' })
    expect(vatPreview([{ product: { ...product, vatRate: '0.00' }, quantity: 2 }], shops)).toEqual({
      net: '20.00',
      vat: '0.00',
    })
  })
})

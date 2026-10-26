import { describe, expect, it } from 'vitest'
import { quantityOptions } from './CartPage'

describe('cart quantity options for mobile and desktop', () => {
  it('offers quantities 1 through 50 when sufficient stock is available', () => {
    const options = quantityOptions(1, 1000, 1)
    expect(options).toHaveLength(50)
    expect(options[0]).toBe(1)
    expect(options.at(-1)).toBe(50)
  })

  it('supports a product minimum of 4 without stopping at 13', () => {
    const options = quantityOptions(4, 1000, 4)
    expect(options[0]).toBe(4)
    expect(options.at(-1)).toBe(50)
    expect(options).toContain(13)
  })

  it('never offers quantities greater than available stock', () => {
    expect(quantityOptions(1, 12, 1).at(-1)).toBe(12)
  })

  it('preserves an existing quantity above 50 instead of making it unselectable', () => {
    expect(quantityOptions(1, 100, 60).at(-1)).toBe(60)
  })

  it('honours a minimum above 50 for bulk-preorder products', () => {
    expect(quantityOptions(55, 1000, 55)[0]).toBe(55)
  })
})

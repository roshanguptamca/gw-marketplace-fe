import { describe, expect, it } from 'vitest'
import { productFixture } from '../test/fixtures'
import { cartReducer, type CartState } from './cartReducer'

describe('cart reducer', () => {
  const empty: CartState = { items: [] }

  it('hydrates valid quantities only', () => {
    const result = cartReducer(empty, {
      type: 'hydrate',
      items: [
        { product: productFixture, quantity: 2 },
        { product: { ...productFixture, id: 'zero' }, quantity: 0 },
      ],
    })
    expect(result.items).toHaveLength(1)
  })

  it('adds a product and caps quantity at stock', () => {
    const added = cartReducer(empty, { type: 'add', product: productFixture, quantity: 2 })
    expect(added.items[0].quantity).toBe(2)
    const capped = cartReducer(added, { type: 'add', product: productFixture, quantity: 5 })
    expect(capped.items[0].quantity).toBe(3)
  })

  it('uses one as the minimum add quantity and ignores unavailable products', () => {
    expect(
      cartReducer(empty, { type: 'add', product: productFixture, quantity: 0 }).items[0].quantity,
    ).toBe(1)
    expect(cartReducer(empty, { type: 'add', product: { ...productFixture, stock: 0 } })).toBe(
      empty,
    )
  })

  it('updates, removes and clears products', () => {
    const added = cartReducer(empty, { type: 'add', product: productFixture })
    expect(
      cartReducer(added, { type: 'update', productId: productFixture.id, quantity: 2 }).items[0]
        .quantity,
    ).toBe(2)
    expect(
      cartReducer(added, { type: 'update', productId: productFixture.id, quantity: 0 }).items,
    ).toEqual([])
    expect(cartReducer(added, { type: 'remove', productId: productFixture.id }).items).toEqual([])
    expect(cartReducer(added, { type: 'clear' }).items).toEqual([])
  })

  it('leaves unrelated products unchanged', () => {
    const added = cartReducer(empty, { type: 'add', product: productFixture })
    expect(cartReducer(added, { type: 'update', productId: 'missing', quantity: 2 })).toEqual(added)
  })

  it('starts and clamps rule-based products at their minimum quantity', () => {
    const samosa = {
      ...productFixture,
      id: 'samosa',
      price: 5,
      stock: 50,
      sellingUnit: 'PACK' as const,
      unitsPerPack: 2,
      orderingRules: {
        minimumOrderQuantity: null,
        minimumPhysicalUnits: 10,
        minimumOrderAmount: null,
        orderLeadTimeHours: 24,
      },
    }
    const added = cartReducer(empty, { type: 'add', product: samosa })
    expect(added.items[0].quantity).toBe(5)
    const again = cartReducer(added, { type: 'add', product: samosa })
    expect(again.items[0].quantity).toBe(6)
    expect(
      cartReducer(again, { type: 'update', productId: 'samosa', quantity: 2 }).items[0].quantity,
    ).toBe(5)
    expect(cartReducer(again, { type: 'update', productId: 'samosa', quantity: 0 }).items).toEqual(
      [],
    )
  })

  it('refreshes stored product data when the same product is added again', () => {
    const added = cartReducer(empty, { type: 'add', product: productFixture })
    const updated = { ...productFixture, sellingUnit: 'PLATE' as const }
    expect(cartReducer(added, { type: 'add', product: updated }).items[0].product.sellingUnit).toBe(
      'PLATE',
    )
  })
})

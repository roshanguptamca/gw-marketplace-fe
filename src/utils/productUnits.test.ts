import { describe, expect, it } from 'vitest'
import type { Product } from '../types/marketplace'
import { describeOrderRuleError, formatPickupMoment } from './orderRuleErrors'
import {
  describeQuantity,
  effectiveMinimumQuantity,
  formatMeasure,
  orderingRuleLines,
  physicalQuantity,
  physicalTotalLabel,
  productRuleViolations,
  sellingFormatLabel,
} from './productUnits'

const euro = (value: number) => `€${value.toFixed(2)}`

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: '1',
    shopSlug: 'shop',
    name: 'Item',
    description: '',
    price: 5,
    currency: 'EUR',
    category: 'Food',
    stock: 100,
    images: [],
    ...overrides,
  }
}

const samosa = product({
  name: 'Samosa',
  sellingUnit: 'PACK',
  unitsPerPack: 2,
  orderingRules: {
    minimumOrderQuantity: null,
    minimumPhysicalUnits: 10,
    minimumOrderAmount: 20,
    orderLeadTimeHours: 24,
  },
})

const namakPare = product({
  name: 'Namak Pare',
  sellingUnit: 'WEIGHT',
  weightValue: 250,
  weightUnit: 'GRAM',
  orderingRules: {
    minimumOrderQuantity: 2,
    minimumPhysicalUnits: null,
    minimumOrderAmount: 10,
    orderLeadTimeHours: 12,
  },
})

describe('product units', () => {
  it('labels every selling unit', () => {
    expect(sellingFormatLabel(product())).toBe('1 piece')
    expect(sellingFormatLabel(samosa)).toBe('2 pieces')
    expect(sellingFormatLabel(namakPare)).toBe('250 g')
    expect(sellingFormatLabel(product({ sellingUnit: 'PLATE' }))).toBe('1 plate')
    expect(sellingFormatLabel(product({ sellingUnit: 'BOX', unitsPerPack: 6 }))).toBe(
      '1 box (6 pieces)',
    )
    expect(sellingFormatLabel(product({ sellingUnit: 'TRAY' }))).toBe('1 tray')
    expect(sellingFormatLabel(product({ sellingUnit: 'BOTTLE' }))).toBe('1 bottle')
  })

  it('treats legacy cart products without selling fields as single pieces', () => {
    const legacy = product()
    expect(physicalQuantity(legacy, 3)).toBe(3)
    expect(describeQuantity(legacy, 3)).toBe('3 pieces')
    expect(effectiveMinimumQuantity(legacy)).toBe(1)
    expect(productRuleViolations(legacy, 1, euro)).toEqual([])
  })

  it('separates cart quantity from physical pieces for packs', () => {
    expect(physicalQuantity(samosa, 5)).toBe(10)
    expect(describeQuantity(samosa, 5)).toBe('5 packs × 2 pieces (10 pieces)')
    expect(physicalTotalLabel(samosa, 5)).toBe('10 pieces')
  })

  it('calculates weight totals and normalises to kg / L', () => {
    expect(describeQuantity(namakPare, 2)).toBe('2 × 250 g (500 g)')
    expect(describeQuantity({ ...namakPare, weightValue: 500 }, 2)).toBe('2 × 500 g (1 kg)')
    expect(formatMeasure(0.75, 'KILOGRAM')).toBe('750 g')
    expect(formatMeasure(1320, 'MILLILITRE')).toBe('1.32 L')
    expect(formatMeasure(1.5, 'LITRE')).toBe('1.5 L')
  })

  it('derives the minimum cart quantity from every configured rule', () => {
    expect(effectiveMinimumQuantity(samosa)).toBe(5)
    expect(effectiveMinimumQuantity({ ...samosa, unitsPerPack: 4 })).toBe(4)
    expect(effectiveMinimumQuantity(namakPare)).toBe(2)
    expect(
      effectiveMinimumQuantity(
        product({
          price: 5.1,
          orderingRules: {
            minimumOrderQuantity: null,
            minimumPhysicalUnits: null,
            minimumOrderAmount: 20.4,
            orderLeadTimeHours: 0,
          },
        }),
      ),
    ).toBe(4)
  })

  it('reports rule violations for physical units, quantity and amount', () => {
    expect(productRuleViolations(samosa, 3, euro).map((violation) => violation.code)).toEqual([
      'PRODUCT_MINIMUM_UNITS_NOT_MET',
      'PRODUCT_MINIMUM_AMOUNT_NOT_MET',
    ])
    expect(productRuleViolations(samosa, 5, euro)).toEqual([])
    expect(productRuleViolations(namakPare, 1, euro).map((violation) => violation.code)).toEqual([
      'PRODUCT_MINIMUM_QUANTITY_NOT_MET',
      'PRODUCT_MINIMUM_AMOUNT_NOT_MET',
    ])
  })

  it('lists only configured rules for product pages', () => {
    expect(orderingRuleLines(samosa, euro)).toEqual([
      'Minimum order: 10 pieces',
      'Minimum amount: €20.00',
      'Order at least 24 hours in advance',
    ])
    expect(orderingRuleLines(namakPare, euro)).toEqual([
      'Minimum: 2 packs / 500 g',
      'Minimum amount: €10.00',
      'Order at least 12 hours in advance',
    ])
    expect(orderingRuleLines(product(), euro)).toEqual([])
  })
})

describe('order rule errors', () => {
  it('turns structured backend errors into clear messages', () => {
    expect(
      describeOrderRuleError(
        'PRODUCT_MINIMUM_UNITS_NOT_MET',
        { product_name: 'Samosa', minimum_physical_units: 10, current_physical_units: 6 },
        'EUR',
      ),
    ).toBe('Samosa requires at least 10 pieces (you selected 6).')
    expect(
      describeOrderRuleError(
        'PRODUCT_MINIMUM_AMOUNT_NOT_MET',
        { product_name: 'Idli', minimum_amount: '20.00', current_amount: '15.00' },
        'EUR',
      ),
    ).toBe('Idli requires a minimum order of €20.00 (currently €15.00).')
    expect(
      describeOrderRuleError(
        'PICKUP_TIME_TOO_EARLY',
        {
          shop_name: 'Kitchen',
          required_lead_time_hours: 48,
          earliest_available_pickup: '2026-10-03T14:00:00+02:00',
        },
        'EUR',
      ),
    ).toBe(
      'The selected pickup time for Kitchen is too early: the order needs 48 hours of preparation. Earliest available pickup: Saturday 3 October 14:00. Please choose a new time.',
    )
    expect(describeOrderRuleError('SOMETHING_ELSE', {}, 'EUR')).toBeNull()
  })

  it('shows shop-local pickup times regardless of browser timezone', () => {
    expect(formatPickupMoment('2026-10-31T12:00:00+01:00')).toBe('Saturday 31 October 12:00')
  })
})

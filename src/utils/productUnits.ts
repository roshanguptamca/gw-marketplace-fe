import type { MeasureUnit, Product, SellingUnit } from '../types/marketplace'

// Mirrors gw-backend apps/marketplace/ordering.py. The backend stays authoritative;
// these helpers only explain quantities and pre-validate the cart for the buyer.

type UnitProduct = Pick<
  Product,
  'name' | 'price' | 'sellingUnit' | 'unitsPerPack' | 'weightValue' | 'weightUnit' | 'orderingRules'
>

export const SELLING_UNIT_LABELS: Record<SellingUnit, string> = {
  PIECE: 'Piece',
  PACK: 'Pack',
  PLATE: 'Plate',
  BOX: 'Box',
  TRAY: 'Tray',
  BOTTLE: 'Bottle',
  WEIGHT: 'Weight / volume',
}

export const MEASURE_UNIT_LABELS: Record<MeasureUnit, string> = {
  GRAM: 'gram (g)',
  KILOGRAM: 'kilogram (kg)',
  MILLILITRE: 'millilitre (ml)',
  LITRE: 'litre (L)',
}

const UNIT_NAMES: Record<Exclude<SellingUnit, 'WEIGHT'>, [string, string]> = {
  PIECE: ['piece', 'pieces'],
  PACK: ['pack', 'packs'],
  PLATE: ['plate', 'plates'],
  BOX: ['box', 'boxes'],
  TRAY: ['tray', 'trays'],
  BOTTLE: ['bottle', 'bottles'],
}

const MEASURES: Record<MeasureUnit, { base: 'GRAM' | 'MILLILITRE'; factor: number }> = {
  GRAM: { base: 'GRAM', factor: 1 },
  KILOGRAM: { base: 'GRAM', factor: 1000 },
  MILLILITRE: { base: 'MILLILITRE', factor: 1 },
  LITRE: { base: 'MILLILITRE', factor: 1000 },
}

const SYMBOLS = {
  GRAM: { small: 'g', large: 'kg' },
  MILLILITRE: { small: 'ml', large: 'L' },
}

export function sellingUnitOf(product: Partial<UnitProduct>): SellingUnit {
  return product.sellingUnit ?? 'PIECE'
}

export function piecesPerUnit(product: Partial<UnitProduct>): number {
  if (sellingUnitOf(product) === 'WEIGHT') return 1
  return product.unitsPerPack && product.unitsPerPack > 0 ? product.unitsPerPack : 1
}

export function physicalQuantity(product: Partial<UnitProduct>, quantity: number): number {
  return quantity * piecesPerUnit(product)
}

function trim(value: number): string {
  return String(Number(value.toFixed(3)))
}

export function formatMeasure(value: number | null | undefined, unit?: MeasureUnit | null): string {
  if (value === null || value === undefined || !unit || !MEASURES[unit]) return ''
  const { base, factor } = MEASURES[unit]
  const baseValue = value * factor
  if (baseValue >= 1000) return `${trim(baseValue / 1000)} ${SYMBOLS[base].large}`
  return `${trim(baseValue)} ${SYMBOLS[base].small}`
}

export function totalWeightLabel(product: Partial<UnitProduct>, quantity: number): string {
  return formatMeasure(
    product.weightValue === null || product.weightValue === undefined
      ? null
      : product.weightValue * quantity,
    product.weightUnit,
  )
}

export function pluralizeUnit(count: number, unit: SellingUnit): string {
  const [singular, plural] = UNIT_NAMES[unit === 'WEIGHT' ? 'PIECE' : unit]
  return `${count} ${count === 1 ? singular : plural}`
}

/** False for plain single pieces, where unit labels would only add noise. */
export function hasSellingFormatDetails(product: Partial<UnitProduct>): boolean {
  return sellingUnitOf(product) !== 'PIECE' || piecesPerUnit(product) > 1
}

/** One sellable unit, e.g. "2 pieces", "250 g", "1 plate". */
export function sellingFormatLabel(product: Partial<UnitProduct>): string {
  const unit = sellingUnitOf(product)
  if (unit === 'WEIGHT') return formatMeasure(product.weightValue, product.weightUnit)
  const perUnit = piecesPerUnit(product)
  if ((unit === 'PIECE' || unit === 'PACK') && perUnit > 1) return pluralizeUnit(perUnit, 'PIECE')
  if (perUnit > 1) return `1 ${UNIT_NAMES[unit][0]} (${pluralizeUnit(perUnit, 'PIECE')})`
  return `1 ${UNIT_NAMES[unit][0]}`
}

/** Cart line description, e.g. "5 packs × 2 pieces (10 pieces)" or "2 × 250 g (500 g)". */
export function describeQuantity(product: Partial<UnitProduct>, quantity: number): string {
  const unit = sellingUnitOf(product)
  if (unit === 'WEIGHT') {
    const each = formatMeasure(product.weightValue, product.weightUnit)
    return each
      ? `${quantity} × ${each} (${totalWeightLabel(product, quantity)})`
      : String(quantity)
  }
  const perUnit = piecesPerUnit(product)
  if (perUnit > 1) {
    const labelUnit = unit === 'PIECE' ? 'PACK' : unit
    return `${pluralizeUnit(quantity, labelUnit)} × ${pluralizeUnit(perUnit, 'PIECE')} (${pluralizeUnit(quantity * perUnit, 'PIECE')})`
  }
  return pluralizeUnit(quantity, unit)
}

/** Short physical total shown under a quantity selector, e.g. "10 pieces" or "500 g". */
export function physicalTotalLabel(product: Partial<UnitProduct>, quantity: number): string {
  if (sellingUnitOf(product) === 'WEIGHT') return totalWeightLabel(product, quantity)
  if (piecesPerUnit(product) > 1) return pluralizeUnit(physicalQuantity(product, quantity), 'PIECE')
  return ''
}

/** Smallest cart quantity that satisfies every configured product rule. */
export function effectiveMinimumQuantity(product: Partial<UnitProduct>): number {
  const rules = product.orderingRules
  const candidates = [1]
  if (rules?.minimumOrderQuantity) candidates.push(rules.minimumOrderQuantity)
  if (rules?.minimumPhysicalUnits) {
    candidates.push(Math.ceil(rules.minimumPhysicalUnits / piecesPerUnit(product)))
  }
  if (rules?.minimumOrderAmount && product.price && product.price > 0) {
    // Work in cents to avoid floating point rounding (e.g. 20 / 5.1).
    const minimumCents = Math.round(rules.minimumOrderAmount * 100)
    const priceCents = Math.round(product.price * 100)
    candidates.push(Math.ceil(minimumCents / priceCents))
  }
  return Math.max(...candidates)
}

export function leadTimeHours(product: Partial<UnitProduct>): number {
  return product.orderingRules?.orderLeadTimeHours ?? 0
}

export function formatLeadTime(hours: number): string {
  if (hours <= 0) return ''
  return `${trim(hours)} ${hours === 1 ? 'hour' : 'hours'}`
}

export interface RuleViolation {
  code:
    | 'PRODUCT_MINIMUM_QUANTITY_NOT_MET'
    | 'PRODUCT_MINIMUM_UNITS_NOT_MET'
    | 'PRODUCT_MINIMUM_AMOUNT_NOT_MET'
  message: string
}

export function productRuleViolations(
  product: UnitProduct,
  quantity: number,
  formatPrice: (value: number) => string,
): RuleViolation[] {
  const rules = product.orderingRules
  if (!rules) return []
  const violations: RuleViolation[] = []
  if (rules.minimumOrderQuantity && quantity < rules.minimumOrderQuantity) {
    violations.push({
      code: 'PRODUCT_MINIMUM_QUANTITY_NOT_MET',
      message: `${product.name}: order at least ${rules.minimumOrderQuantity}.`,
    })
  }
  if (
    rules.minimumPhysicalUnits &&
    physicalQuantity(product, quantity) < rules.minimumPhysicalUnits
  ) {
    violations.push({
      code: 'PRODUCT_MINIMUM_UNITS_NOT_MET',
      message: `${product.name}: order at least ${pluralizeUnit(rules.minimumPhysicalUnits, 'PIECE')} (${effectiveMinimumQuantity(
        product,
      )} × ${sellingFormatLabel(product)}).`,
    })
  }
  if (
    rules.minimumOrderAmount &&
    Math.round(product.price * quantity * 100) < Math.round(rules.minimumOrderAmount * 100)
  ) {
    violations.push({
      code: 'PRODUCT_MINIMUM_AMOUNT_NOT_MET',
      message: `${product.name}: minimum order amount is ${formatPrice(rules.minimumOrderAmount)}.`,
    })
  }
  return violations
}

/** Lines describing configured rules only, for product details pages. */
export function orderingRuleLines(
  product: UnitProduct,
  formatPrice: (value: number) => string,
): string[] {
  const rules = product.orderingRules
  if (!rules) return []
  const lines: string[] = []
  const unit = sellingUnitOf(product)
  if (rules.minimumPhysicalUnits) {
    lines.push(`Minimum order: ${pluralizeUnit(rules.minimumPhysicalUnits, 'PIECE')}`)
  } else if (rules.minimumOrderQuantity && rules.minimumOrderQuantity > 1) {
    const quantity = rules.minimumOrderQuantity
    const physical = physicalTotalLabel(product, quantity)
    const label = pluralizeUnit(quantity, unit === 'WEIGHT' ? 'PACK' : unit)
    lines.push(`Minimum: ${label}${physical ? ` / ${physical}` : ''}`)
  }
  if (rules.minimumOrderAmount)
    lines.push(`Minimum amount: ${formatPrice(rules.minimumOrderAmount)}`)
  if (rules.orderLeadTimeHours > 0) {
    lines.push(`Order at least ${formatLeadTime(rules.orderLeadTimeHours)} in advance`)
  }
  return lines
}

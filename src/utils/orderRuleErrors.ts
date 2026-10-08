import { formatPrice } from './shopLinks'
import { formatLeadTime } from './productUnits'
import type { Product } from '../types/marketplace'

type ErrorDetails = Record<string, unknown> | undefined

export function formatPickupMoment(value: unknown, language = 'en'): string {
  // Backend sends shop-local ISO times (e.g. 2026-10-03T14:00:00+02:00); show that wall-clock
  // time rather than converting to the browser's timezone.
  if (typeof value !== 'string') return ''
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  if (!match) return value
  const day = new Date(`${match[1]}T00:00:00Z`).toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
  return `${day} ${match[2]}`
}

type Translate = (key: string, values?: Record<string, string | number>) => string

/** Turns structured order-rule errors from the backend into buyer-friendly text. */
export function describeOrderRuleError(
  code: string | undefined,
  detail: ErrorDetails,
  currency: string,
  translate?: Translate,
  language = 'en',
): string | null {
  const name = typeof detail?.product_name === 'string' ? detail.product_name : 'This product'
  const shopName = typeof detail?.shop_name === 'string' ? detail.shop_name : 'this shop'
  const t: Translate = translate ?? (() => '')
  switch (code) {
    case 'PRODUCT_MINIMUM_QUANTITY_NOT_MET':
      return translate
        ? t('productMinQuantity', { name, minimum: String(detail?.minimum_quantity) })
        : `${name} requires a minimum order quantity of ${String(detail?.minimum_quantity)}.`
    case 'PRODUCT_MINIMUM_UNITS_NOT_MET':
      return translate
        ? t('productMinUnits', {
            name,
            minimum: String(detail?.minimum_physical_units),
            current: String(detail?.current_physical_units),
          })
        : `${name} requires at least ${String(detail?.minimum_physical_units)} pieces (you selected ${String(detail?.current_physical_units)}).`
    case 'PRODUCT_MINIMUM_AMOUNT_NOT_MET':
      return translate
        ? t('productMinAmount', {
            name,
            minimum: formatPrice(Number(detail?.minimum_amount), currency),
            current: formatPrice(Number(detail?.current_amount), currency),
          })
        : `${name} requires a minimum order of ${formatPrice(Number(detail?.minimum_amount), currency)} (currently ${formatPrice(Number(detail?.current_amount), currency)}).`
    case 'PICKUP_SLOT_REQUIRED':
      return translate ? t('choosePickupTime', { shop: shopName }) : `Please choose a pickup date and time for ${shopName}.`
    case 'PICKUP_TIME_TOO_EARLY': {
      const earliest = formatPickupMoment(detail?.earliest_available_pickup, language)
      if (translate) {
        return t('pickupTooEarly', {
          shop: shopName,
          lead: formatLeadTime(Number(detail?.required_lead_time_hours)),
          earliest: earliest ? t('earliestPickup', { time: earliest }) : '',
        })
      }

      return `The selected pickup time for ${shopName} is too early: the order needs ${formatLeadTime(Number(detail?.required_lead_time_hours))} of preparation.${earliest ? ` Earliest available pickup: ${earliest}.` : ''} Please choose a new time.`
    }
    case 'PICKUP_SLOT_INVALID':
      return translate
        ? t('pickupInvalid', { shop: shopName })
        : `The selected pickup time for ${shopName} is no longer available. Please choose another time.`
    default:
      return null
  }
}

export function describeProductRuleViolation(
  product: Product,
  quantity: number,
  code: string,
  currency: string,
  translate?: Translate,
  language = 'en',
): string | null {
  const rules = product.orderingRules
  if (!rules) return null
  const currentPhysicalUnits =
    product.sellingUnit === 'WEIGHT' ? quantity : quantity * (product.unitsPerPack ?? 1)
  const detail: Record<string, unknown> = { product_name: product.name }
  if (code === 'PRODUCT_MINIMUM_QUANTITY_NOT_MET') {
    detail.minimum_quantity = rules.minimumOrderQuantity
  } else if (code === 'PRODUCT_MINIMUM_UNITS_NOT_MET') {
    detail.minimum_physical_units = rules.minimumPhysicalUnits
    detail.current_physical_units = currentPhysicalUnits
  } else if (code === 'PRODUCT_MINIMUM_AMOUNT_NOT_MET') {
    detail.minimum_amount = rules.minimumOrderAmount
    detail.current_amount = product.price * quantity
  }
  return describeOrderRuleError(code, detail, currency, translate, language)
}

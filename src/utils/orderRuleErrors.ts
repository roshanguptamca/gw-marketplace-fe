import { formatPrice } from './shopLinks'
import { formatLeadTime } from './productUnits'

type ErrorDetails = Record<string, unknown> | undefined

export function formatPickupMoment(value: unknown): string {
  // Backend sends shop-local ISO times (e.g. 2026-10-03T14:00:00+02:00); show that wall-clock
  // time rather than converting to the browser's timezone.
  if (typeof value !== 'string') return ''
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  if (!match) return value
  const day = new Date(`${match[1]}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
  return `${day} ${match[2]}`
}

/** Turns structured order-rule errors from the backend into buyer-friendly text. */
export function describeOrderRuleError(
  code: string | undefined,
  detail: ErrorDetails,
  currency: string,
): string | null {
  const name = typeof detail?.product_name === 'string' ? detail.product_name : 'This product'
  const shopName = typeof detail?.shop_name === 'string' ? detail.shop_name : 'this shop'
  switch (code) {
    case 'PRODUCT_MINIMUM_QUANTITY_NOT_MET':
      return `${name} requires a minimum order quantity of ${String(detail?.minimum_quantity)}.`
    case 'PRODUCT_MINIMUM_UNITS_NOT_MET':
      return `${name} requires at least ${String(detail?.minimum_physical_units)} pieces (you selected ${String(detail?.current_physical_units)}).`
    case 'PRODUCT_MINIMUM_AMOUNT_NOT_MET':
      return `${name} requires a minimum order of ${formatPrice(Number(detail?.minimum_amount), currency)} (currently ${formatPrice(Number(detail?.current_amount), currency)}).`
    case 'PICKUP_SLOT_REQUIRED':
      return `Please choose a pickup date and time for ${shopName}.`
    case 'PICKUP_TIME_TOO_EARLY': {
      const earliest = formatPickupMoment(detail?.earliest_available_pickup)
      return `The selected pickup time for ${shopName} is too early: the order needs ${formatLeadTime(Number(detail?.required_lead_time_hours))} of preparation.${earliest ? ` Earliest available pickup: ${earliest}.` : ''} Please choose a new time.`
    }
    case 'PICKUP_SLOT_INVALID':
      return `The selected pickup time for ${shopName} is no longer available. Please choose another time.`
    default:
      return null
  }
}

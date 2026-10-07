import type { CartItem, Shop } from '../types/marketplace'

function hundredths(value: string): bigint | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value)
  return match ? BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0')) : null
}

function amount(cents: bigint): string {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}

export function vatPreview(
  items: CartItem[],
  shops: Record<string, Shop>,
  delivery: Array<{ shopSlug: string; amount: string }> = [],
): { net: string; vat: string } | null {
  let net = 0n
  let vat = 0n
  const add = (gross: bigint, rate: bigint) => {
    const divisor = 10000n + rate
    const lineNet = (gross * 10000n + divisor / 2n) / divisor
    net += lineNet
    vat += gross - lineNet
  }
  for (const { product, quantity } of items) {
    const rateValue = product.vatRate ?? shops[product.shopSlug]?.defaultVatRate
    if (
      rateValue === undefined ||
      rateValue === null ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    )
      return null
    const rate = hundredths(rateValue)
    const price = hundredths(product.priceAmount ?? String(product.price))
    if (rate === null || rate > 10000n || price === null) return null
    add(price * BigInt(quantity), rate)
  }
  for (const fee of delivery) {
    const gross = hundredths(fee.amount)
    if (gross === 0n) continue
    const rateValue = shops[fee.shopSlug]?.defaultVatRate
    const rate = rateValue === undefined ? null : hundredths(rateValue)
    if (gross === null || rate === null || rate > 10000n) return null
    add(gross, rate)
  }
  return { net: amount(net), vat: amount(vat) }
}

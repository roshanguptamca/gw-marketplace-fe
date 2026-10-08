import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { analytics } from '../analytics/analytics'
import { useCart } from '../cart/CartContext'
import { groupItemsByShop } from '../cart/groupByShop'
import { useShopsForItems } from '../cart/useShopsForItems'
import { EmptyState } from '../components/EmptyState'
import { InclusiveVat } from '../components/InclusiveVat'
import { vatPreview } from '../utils/vatPreview'
import { continueShoppingPath, formatPrice } from '../utils/shopLinks'
import { getFirstProductImageUrl, handleProductImageError } from '../utils/productImages'
import { describeProductRuleViolation } from '../utils/orderRuleErrors'
import {
  describeQuantity,
  effectiveMinimumQuantity,
  hasSellingFormatDetails,
  productRuleViolations,
  sellingFormatLabel,
} from '../utils/productUnits'

function quantityOptions(minimum: number, stock: number, current: number): number[] {
  const last = Math.max(Math.min(stock, Math.max(minimum + 9, 10)), current)
  return Array.from({ length: Math.max(last - minimum + 1, 1) }, (_, index) => minimum + index)
}

export function CartPage() {
  const { t, i18n } = useTranslation()
  const { items, subtotal, updateQuantity, removeItem } = useCart()
  const { shopsBySlug, error: shopError } = useShopsForItems(items)

  if (items.length === 0) {
    return (
      <main className="page-shell section">
        <EmptyState
          title={t('yourCartEmpty')}
          message={t('cartEmptyMessage')}
          action={
            <Link className="button" to="/">
              {t('browse')}
            </Link>
          }
        />
      </main>
    )
  }

  const currency = items[0].product.currency
  const shopGroups = groupItemsByShop(items)
  const isMultiShop = shopGroups.length > 1
  const continuePath = continueShoppingPath(shopGroups.map((group) => group.shopSlug))

  return (
    <main className="page-shell section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('yourSelection')}</p>
          <h1>{t('shoppingCart')}</h1>
        </div>
        <p>{t('uniqueItems', { count: items.length })}</p>
      </div>
      <div className="cart-layout">
        {shopError && <p role="alert">{shopError}</p>}
        <section className="cart-items" aria-label="Cart items">
          {shopGroups.map((group) => {
            const shop = shopsBySlug[group.shopSlug]
            return (
              <div className="cart-shop-group" key={group.shopSlug}>
                {isMultiShop && (
                  <div className="cart-shop-group__header">
                    <h2>{shop?.name ?? group.shopSlug}</h2>
                    <span>{formatPrice(group.subtotal, currency)}</span>
                  </div>
                )}
                {Number(shop?.minimumOrderAmount ?? 0) > 0 && (
                  <div className="shop-minimum">
                    <p>{t('productsSubtotal')} {formatPrice(group.subtotal, currency)}</p>
                    <p>{t('minimumOrder')} {formatPrice(Number(shop?.minimumOrderAmount), currency)}</p>
                    {Math.round(group.subtotal * 100) <
                      Math.round(Number(shop?.minimumOrderAmount) * 100) && (
                      <p>
                        {formatPrice(
                          (Math.round(Number(shop?.minimumOrderAmount) * 100) -
                            Math.round(group.subtotal * 100)) /
                            100,
                          currency,
                        )}{' '}
                        {t('moreRequired')}
                      </p>
                    )}
                  </div>
                )}
                {group.items.map(({ product, quantity }) => {
                  const violations = productRuleViolations(product, quantity, (value) =>
                    formatPrice(value, product.currency),
                  )
                  const showUnits = hasSellingFormatDetails(product)
                  return (
                    <article className="cart-item" key={product.id}>
                      <img
                        src={getFirstProductImageUrl(product.images)}
                        alt={product.name}
                        onError={handleProductImageError}
                      />
                      <div className="cart-item__details">
                        <p className="eyebrow">{shop?.name ?? product.shopSlug}</p>
                        <h2>{product.name}</h2>
                        <p>
                          {formatPrice(product.price, product.currency)}
                          {showUnits ? ` · ${sellingFormatLabel(product)}` : ''}
                        </p>
                        {showUnits && (
                          <p className="cart-item__units" data-testid="cart-item-units">
                            {describeQuantity(product, quantity)}
                          </p>
                        )}
                        {violations.map((violation) => (
                          <p className="cart-item__rules" role="alert" key={violation.code}>
                            {i18n.language === 'nl'
                              ? describeProductRuleViolation(
                                  product,
                                  quantity,
                                  violation.code,
                                  product.currency,
                                  (key, values) => t(key, values),
                                  i18n.language,
                                ) ?? violation.message
                              : violation.message}
                          </p>
                        ))}
                        <button
                          className="text-button"
                          onClick={() => {
                            analytics.event('remove_from_cart', {
                              item_id: product.id,
                              value: product.price * quantity,
                              currency: product.currency,
                              items: [{ item_id: product.id, quantity, price: product.price }],
                            })
                            removeItem(product.id)
                          }}
                        >
                          {t('remove')}
                        </button>
                      </div>
                      <label className="quantity">
                        <span>{t('quantity')}</span>
                        <select
                          value={quantity}
                          onChange={(event) =>
                            updateQuantity(product.id, Number(event.target.value))
                          }
                        >
                          {quantityOptions(
                            effectiveMinimumQuantity(product),
                            product.stock,
                            quantity,
                          ).map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                      <strong>{formatPrice(product.price * quantity, product.currency)}</strong>
                    </article>
                  )
                })}
              </div>
            )
          })}
        </section>
        <aside className="order-summary">
          <h2>{t('orderSummary')}</h2>
          {isMultiShop && (
            <p className="inline-note">{t('separateShipping', { count: shopGroups.length })}</p>
          )}
          <div>
            <span>{t('subtotalInclVat')}</span>
            <strong>{formatPrice(subtotal, currency)}</strong>
          </div>
          <div>
            <span>{t('shipping')}</span>
            <span>{t('calculatedAtCheckout')}</span>
          </div>
          <InclusiveVat breakdown={vatPreview(items, shopsBySlug)} currency={currency} />
          <p>{t('deliveryAtCheckout')}</p>
          <Link className="button button--wide" to="/checkout">
            {t('proceedToCheckout')}
          </Link>
          <Link className="back-link cart-continue-shopping" to={continuePath}>
            ← {t('continueShopping')}
          </Link>
        </aside>
      </div>
    </main>
  )
}

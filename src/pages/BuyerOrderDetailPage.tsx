import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import type { BuyerOrder } from '../types/marketplace'
import { WhatsAppGroupLink } from '../components/ShopFulfilment'
import { OrderInvoices } from '../components/OrderInvoices'
import { InclusiveVat } from '../components/InclusiveVat'

export function BuyerOrderDetailPage() {
  const { t, i18n } = useTranslation()
  const { orderId } = useParams<{ orderId: string }>()
  const {
    data: order,
    loading,
    error,
  } = useMarketplaceData(() => marketplaceService.getBuyerOrder(orderId ?? ''), [orderId])
  // Local override so the UI updates immediately after a successful cancel,
  // without needing a full refetch/refresh of the page.
  const [localOrder, setLocalOrder] = useState<BuyerOrder | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const displayOrder = localOrder ?? order

  const handleCancel = async () => {
    if (!displayOrder) return
    if (!window.confirm(t('cancelOrderConfirm'))) return
    setCancelling(true)
    setCancelError('')
    try {
      const updated = await marketplaceService.cancelBuyerOrder(displayOrder.id)
      setLocalOrder(updated)
    } catch (caught) {
      setCancelError(
        i18n.language === 'nl'
          ? t('couldNotCancel')
          : caught instanceof Error
            ? caught.message
            : t('couldNotCancel'),
      )
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <LoadingState label={t('loadingOrder')} />
  if (error || !displayOrder) {
    return (
      <EmptyState
        title={t('orderNotFound')}
        message={t('orderNotFoundMessage')}
        action={
          <Link className="btn btn-secondary" to="/account/orders">
            {t('backToMyOrders')}
          </Link>
        }
      />
    )
  }

  const snapshot = displayOrder.fulfillment_snapshot
  const currency = displayOrder.price_breakdown?.currency ?? snapshot?.currency ?? 'EUR'
  const money = (value: string) => (currency === 'EUR' ? `€${value}` : `${currency} ${value}`)
  const pickup = displayOrder.order_type === 'pickup'
  const address = pickup
    ? snapshot?.pickup_address_line_1
      ? [
          snapshot.pickup_address_line_1,
          snapshot.pickup_address_line_2,
          [snapshot.pickup_postal_code, snapshot.pickup_city].filter(Boolean).join(' '),
          snapshot.pickup_country,
        ]
          .filter(Boolean)
          .join(', ')
      : snapshot?.shop_address
    : displayOrder.delivery_address

  return (
    <section className="order-detail">
      <Link className="back-link" to="/account/orders">
        ← {t('backToMyOrders')}
      </Link>
      <header className="order-detail__header">
        <div>
          <p className="eyebrow">{displayOrder.shop_name}</p>
          <h2>{t('orderNumber', { number: displayOrder.order_number })}</h2>
          <p className="muted">
            {t('placed')}{' '}
            {new Date(displayOrder.created_at).toLocaleDateString(
              i18n.language === 'nl' ? 'nl-NL' : 'en-GB',
              {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              },
            )}
          </p>
        </div>
        <span className={`order-detail__status order-detail__status--${displayOrder.status}`}>
          {t(`status_${displayOrder.status}`, { defaultValue: displayOrder.status.replaceAll('_', ' ') })}
        </span>
      </header>

      <div className="order-detail__layout">
        <div className="order-detail__main">
          <section className="order-detail__card">
            <h3>{t('yourItems')}</h3>
            <ul className="order-detail__items">
              {displayOrder.items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.product_name}</strong>
                    <p className="muted">
                      {item.quantity_description || `${item.quantity} × ${money(item.unit_price)}`}
                    </p>
                  </div>
                  <strong>{money(item.line_total)}</strong>
                </li>
              ))}
            </ul>
            {displayOrder.items.some((item) => item.sku) && (
              <details className="order-detail__extra">
                <summary>{t('productReferences')}</summary>
                {displayOrder.items
                  .filter((item) => item.sku)
                  .map((item) => (
                    <p key={item.id}>
                      {item.product_name}: {item.sku}
                    </p>
                  ))}
              </details>
            )}
          </section>

          <section className="order-detail__card">
            <h3>{pickup ? t('pickupDetails') : t('deliveryDetails')}</h3>
            {snapshot?.pickup_date && pickup && (
              <p className="order-detail__schedule" data-testid="order-pickup-slot">
                <strong>{t('pickupLabel')}</strong> {snapshot.pickup_date}
                {snapshot.pickup_time ? `, ${snapshot.pickup_time}` : ''}
              </p>
            )}
            {address && <address>{address}</address>}
            {(pickup ? snapshot?.pickup_instructions : snapshot?.delivery_instructions) && (
              <p className="order-detail__note">
                {pickup ? snapshot?.pickup_instructions : snapshot?.delivery_instructions}
              </p>
            )}
            {snapshot?.required_lead_time_hours ? (
              <p className="muted">{t('preparationTime')} {snapshot.required_lead_time_hours} {t('hours')}</p>
            ) : null}
            {displayOrder.seller_note && (
              <p className="order-detail__note">
                <strong>{t('noteFromSeller')}</strong> {displayOrder.seller_note}
              </p>
            )}
            <div className="order-detail__contact">
              {snapshot?.shop_email && (
                <a href={`mailto:${snapshot.shop_email}`}>{snapshot.shop_email}</a>
              )}
              {snapshot?.shop_phone && (
                <a href={`tel:${snapshot.shop_phone}`}>{snapshot.shop_phone}</a>
              )}
              <WhatsAppGroupLink url={snapshot?.whatsapp_group_url} />
            </div>
          </section>

          <section className="order-detail__card">
            <OrderInvoices key={displayOrder.id} orderId={displayOrder.id} />
          </section>

          <details className="order-detail__card order-detail__extra">
            <summary>{t('customerPaymentDetails')}</summary>
            <p>{displayOrder.customer_name}</p>
            <p>
              {displayOrder.customer_email} {displayOrder.customer_phone}
            </p>
            <p>{t('paymentMethod')} {t(`payment_${displayOrder.payment_method}`, { defaultValue: displayOrder.payment_method.replaceAll('_', ' ') })}</p>
            <p>{t('paymentStatus')} {t(`payment_${displayOrder.payment_status}`, { defaultValue: displayOrder.payment_status.replaceAll('_', ' ') })}</p>
            {displayOrder.customer_note && <p>{t('yourNote')} {displayOrder.customer_note}</p>}
          </details>
        </div>

        <aside className="order-detail__card order-detail__summary" aria-label={t('priceOverview')}>
          <h3>{t('priceOverview')}</h3>
          <dl className="order-detail__prices">
            <div>
              <dt>{t('subtotalInclVat')}</dt>
              <dd>{money(displayOrder.subtotal)}</dd>
            </div>
            {Number(displayOrder.discount_total) > 0 && (
              <div>
                <dt>{t('discount')}</dt>
                <dd>-{money(displayOrder.discount_total)}</dd>
              </div>
            )}
            <div>
              <dt>{pickup ? t('pickup') : t('shipping')}</dt>
              <dd>
                {Number(displayOrder.delivery_fee) > 0 ? money(displayOrder.delivery_fee) : t('free')}
              </dd>
            </div>
            <div className="order-detail__total">
              <dt>{t('totalInclVat')}</dt>
              <dd>{money(displayOrder.total)}</dd>
            </div>
          </dl>
          <InclusiveVat breakdown={displayOrder.price_breakdown ?? null} currency={currency} />
          {displayOrder.price_breakdown && displayOrder.price_breakdown.rates.length > 1 && (
            <details className="order-detail__extra">
              <summary>{t('vatByRate')}</summary>
              {displayOrder.price_breakdown.rates.map((row) => (
                <p key={row.rate}>{row.rate}% {t('vat')}: {money(row.vat)}</p>
              ))}
            </details>
          )}
          {displayOrder.status === 'pending' && (
            <div className="order-detail__actions">
              <p className="muted">{t('canCancelWhileReviewing')}</p>
              {cancelError && (
                <p className="inline-error" role="alert">
                  {cancelError}
                </p>
              )}
              <button
                type="button"
                className="button button--danger"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? t('cancelling') : t('cancelOrder')}
              </button>
            </div>
          )}
          {displayOrder.status === 'accepted' && (
            <p className="muted">{t('acceptedContactShop')}</p>
          )}
        </aside>
      </div>
    </section>
  )
}

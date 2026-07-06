import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { ApiError } from '../services/apiClient'
import type { BuyerOrder } from '../types/marketplace'

export function BuyerOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { data: order, loading, error } = useMarketplaceData(
    () => marketplaceService.getBuyerOrder(orderId ?? ''),
    [orderId],
  )
  // Local override so the UI updates immediately after a successful cancel,
  // without needing a full refetch/refresh of the page.
  const [localOrder, setLocalOrder] = useState<BuyerOrder | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const displayOrder = localOrder ?? order

  const handleCancel = async () => {
    if (!displayOrder) return
    if (!window.confirm('Cancel this order? This cannot be undone.')) return
    setCancelling(true)
    setCancelError('')
    try {
      const updated = await marketplaceService.cancelBuyerOrder(displayOrder.id)
      setLocalOrder(updated)
    } catch (caught) {
      setCancelError(
        caught instanceof ApiError ? caught.message : 'Could not cancel the order. Please try again.',
      )
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <LoadingState label="Loading order" />
  if (error || !displayOrder) {
    return (
      <EmptyState
        title="Order not found"
        message="We could not find this order, or it does not belong to your account."
        action={
          <Link className="btn btn-secondary" to="/account/orders">
            Back to my orders
          </Link>
        }
      />
    )
  }

  return (
    <section>
      <p className="eyebrow">Marketplace</p>
      <h2>Order {displayOrder.order_number}</h2>
      <p>
        <Link to="/account/orders">← Back to my orders</Link>
      </p>

      <div className="checkout-summary">
        <p>
          <strong>Shop:</strong> {displayOrder.shop_name}
        </p>
        <p>
          <strong>Status:</strong> {displayOrder.status.replaceAll('_', ' ')}
        </p>
        <p>
          <strong>Delivery method:</strong> {displayOrder.order_type === 'pickup' ? 'Pickup' : 'Delivery'}
        </p>
        {displayOrder.order_type === 'delivery' && <p>{displayOrder.delivery_address}</p>}

        <ul className="checkout-items">
          {displayOrder.items.map((item) => (
            <li key={item.id}>
              {item.product_name} × {item.quantity} — €{item.line_total}
            </li>
          ))}
        </ul>

        <p>Subtotal: €{displayOrder.subtotal}</p>
        {Number(displayOrder.discount_total) > 0 && <p>Discount: -€{displayOrder.discount_total}</p>}
        <p>
          Delivery fee:{' '}
          {Number(displayOrder.delivery_fee) > 0 ? `€${displayOrder.delivery_fee}` : 'Free'}
        </p>
        <p>
          <strong>Total: €{displayOrder.total}</strong>
        </p>

        {displayOrder.seller_note && (
          <p>
            <strong>Note from seller:</strong> {displayOrder.seller_note}
          </p>
        )}

        {displayOrder.status === 'pending' && (
          <div className="checkout-cancel-order">
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
              {cancelling ? 'Cancelling…' : 'Cancel order'}
            </button>
            <p className="checkout-cancel-order__hint">
              You can cancel this order now because the seller hasn&apos;t accepted it yet.
            </p>
          </div>
        )}
        {displayOrder.status === 'accepted' && (
          <p className="checkout-cancel-order__hint">
            This order has already been accepted by the seller. Contact the shop directly if you need
            to cancel it.
          </p>
        )}
      </div>
    </section>
  )
}

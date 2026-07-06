import { Link, useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'

export function BuyerOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { data: order, loading, error } = useMarketplaceData(
    () => marketplaceService.getBuyerOrder(orderId ?? ''),
    [orderId],
  )

  if (loading) return <LoadingState label="Loading order" />
  if (error || !order) {
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
      <h2>Order {order.order_number}</h2>
      <p>
        <Link to="/account/orders">← Back to my orders</Link>
      </p>

      <div className="checkout-summary">
        <p>
          <strong>Shop:</strong> {order.shop_name}
        </p>
        <p>
          <strong>Status:</strong> {order.status.replaceAll('_', ' ')}
        </p>
        <p>
          <strong>Delivery method:</strong> {order.order_type === 'pickup' ? 'Pickup' : 'Delivery'}
        </p>
        {order.order_type === 'delivery' && <p>{order.delivery_address}</p>}

        <ul className="checkout-items">
          {order.items.map((item) => (
            <li key={item.id}>
              {item.product_name} × {item.quantity} — €{item.line_total}
            </li>
          ))}
        </ul>

        <p>Subtotal: €{order.subtotal}</p>
        {Number(order.discount_total) > 0 && <p>Discount: -€{order.discount_total}</p>}
        <p>
          Delivery fee:{' '}
          {Number(order.delivery_fee) > 0 ? `€${order.delivery_fee}` : 'Free'}
        </p>
        <p>
          <strong>Total: €{order.total}</strong>
        </p>

        {order.seller_note && (
          <p>
            <strong>Note from seller:</strong> {order.seller_note}
          </p>
        )}
      </div>
    </section>
  )
}

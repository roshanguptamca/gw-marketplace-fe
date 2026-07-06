import { Link } from 'react-router-dom'
import { useState } from 'react'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { ApiError } from '../services/apiClient'
import type { BuyerOrder } from '../types/marketplace'

export function BuyerOrdersPage() {
  const { data, loading, error } = useMarketplaceData(() => marketplaceService.getBuyerOrders(), [])
  const [orders, setOrders] = useState<BuyerOrder[] | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null)
  const displayOrders = orders ?? data ?? []

  const handleCancel = async (order: BuyerOrder) => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return
    setCancellingId(order.id)
    setRowError(null)
    try {
      const updated = await marketplaceService.cancelBuyerOrder(order.id)
      setOrders(displayOrders.map((current) => (current.id === updated.id ? updated : current)))
    } catch (caught) {
      setRowError({
        id: order.id,
        message: caught instanceof ApiError ? caught.message : 'Could not cancel the order.',
      })
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) return <LoadingState label="Loading your orders" />
  if (error) {
    return <EmptyState title="Orders unavailable" message="We could not load your orders. Please try again later." />
  }

  if (displayOrders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        message="Once you place an order with a GuideWisey seller, it will show up here."
        action={
          <Link className="btn btn-primary" to="/">
            Browse the marketplace
          </Link>
        }
      />
    )
  }

  return (
    <section>
      <p className="eyebrow">Marketplace</p>
      <h2>My Orders</h2>
      <div className="seller-table-wrap">
        <table className="seller-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Shop</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {displayOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.order_number}</td>
                <td>{order.shop_name}</td>
                <td>{order.status.replaceAll('_', ' ')}</td>
                <td>€{order.total}</td>
                <td>
                  <Link to={`/account/orders/${order.id}`}>View order</Link>
                  {order.status === 'pending' && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleCancel(order)}
                        disabled={cancellingId === order.id}
                      >
                        {cancellingId === order.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    </>
                  )}
                  {rowError?.id === order.id && (
                    <p className="inline-error" role="alert">
                      {rowError.message}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

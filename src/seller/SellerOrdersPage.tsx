import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { ORDER_STATUS_TRANSITIONS } from '../types/marketplace'

const ORDER_STATUS_FILTERS = [
  { value: '', label: 'All orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
] as const

function SelectedOrderDetails({
  orderId,
  refreshKey,
  onStatusChange,
}: {
  orderId: string
  refreshKey: number
  onStatusChange: (id: number, status: string) => Promise<void>
}) {
  const {
    data: order,
    loading,
    error,
  } = useMarketplaceData(() => marketplaceService.getSellerOrder(orderId), [orderId, refreshKey])
  if (loading) return <LoadingState label="Loading selected order" />
  if (error || !order) {
    return (
      <p className="inline-error" role="alert">
        The selected order could not be loaded, or it does not belong to your shop.
      </p>
    )
  }
  const snapshot = order.fulfillment_snapshot
  const pickupAddress =
    snapshot &&
    [
      snapshot.pickup_address_line_1,
      snapshot.pickup_address_line_2,
      snapshot.pickup_postal_code,
      snapshot.pickup_city,
      snapshot.pickup_country,
    ]
      .filter(Boolean)
      .join(', ')
  const nextOptions = ORDER_STATUS_TRANSITIONS[order.status] ?? []
  return (
    <section className="checkout-summary" aria-label="Selected order details">
      <h3>Order {order.order_number}</h3>
      <p>
        <strong>Customer:</strong> {order.customer_name}
      </p>
      <p>
        <strong>Email:</strong> {order.customer_email}
      </p>
      <p>
        <strong>Phone:</strong> {order.customer_phone}
      </p>
      <p>
        <strong>Status:</strong> {order.status.replaceAll('_', ' ')}
      </p>
      <p>
        <strong>Delivery method:</strong> {order.order_type === 'pickup' ? 'Pickup' : 'Delivery'}
      </p>
      {order.order_type === 'delivery' && (
        <>
          <p>
            <strong>Delivery address:</strong> {order.delivery_address}
          </p>
          {snapshot?.delivery_instructions && (
            <p>
              <strong>Delivery instructions:</strong> {snapshot.delivery_instructions}
            </p>
          )}
        </>
      )}
      {order.order_type === 'pickup' && (
        <>
          {(snapshot?.pickup_date || snapshot?.pickup_time) && (
            <p>
              <strong>Pickup schedule:</strong>{' '}
              {[snapshot.pickup_date, snapshot.pickup_time].filter(Boolean).join(' ')}
            </p>
          )}
          {order.pickup_slot_start && (
            <p>
              <strong>Pickup slot start:</strong> {order.pickup_slot_start}
            </p>
          )}
          {order.pickup_slot_end && (
            <p>
              <strong>Pickup slot end:</strong> {order.pickup_slot_end}
            </p>
          )}
          {(pickupAddress || snapshot?.shop_address) && (
            <p>
              <strong>Pickup address:</strong> {pickupAddress || snapshot?.shop_address}
            </p>
          )}
          {snapshot?.pickup_instructions && (
            <p>
              <strong>Pickup instructions:</strong> {snapshot.pickup_instructions}
            </p>
          )}
        </>
      )}
      <h4>Items</h4>
      <ul className="checkout-items">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.product_name}
            {item.sku ? ` [${item.sku}]` : ''} × {item.quantity}
            {item.quantity_description ? ` (${item.quantity_description})` : ''} — €
            {item.line_total}
          </li>
        ))}
      </ul>
      <p>
        <strong>Customer note:</strong> {order.customer_note || 'No customer note.'}
      </p>
      {order.seller_note && (
        <p>
          <strong>Seller note:</strong> {order.seller_note}
        </p>
      )}
      <p>
        <strong>Total:</strong> €{order.total}
      </p>
      {nextOptions.length > 0 && (
        <select
          aria-label={`Update selected order ${order.order_number}`}
          defaultValue=""
          onChange={(event) => void onStatusChange(order.id, event.target.value)}
        >
          <option value="">Update status</option>
          {nextOptions.map((option) => (
            <option key={option} value={option}>
              {option.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      )}
    </section>
  )
}

export function SellerOrdersPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedStatus = searchParams.get('status') ?? ''
  const query = searchParams.get('q') ?? ''
  const selectedOrderId = searchParams.get('order')
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerOrders({ q: query, status: selectedStatus }),
    [refreshKey, query, selectedStatus],
  )
  const [status, setStatus] = useState('')

  const filteredOrders = useMemo(() => {
    const orders = data ?? []
    return selectedOrderId ? orders.filter((order) => String(order.id) === selectedOrderId) : orders
  }, [data, selectedOrderId])

  const changeStatus = async (id: number, nextStatus: string) => {
    if (!nextStatus) return
    try {
      await marketplaceService.updateSellerOrderStatus(id, nextStatus)
      setRefreshKey((key) => key + 1)
    } catch {
      setStatus('Could not update order status')
    }
  }

  const updateFilter = (nextQuery: string, nextStatus: string) => {
    const params = new URLSearchParams()
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    if (nextStatus) params.set('status', nextStatus)
    setSearchParams(params)
  }

  return (
    <section>
      <p className="eyebrow">Fulfilment</p>
      <h2>Orders</h2>
      {selectedOrderId && (
        <SelectedOrderDetails
          key={selectedOrderId}
          orderId={selectedOrderId}
          refreshKey={refreshKey}
          onStatusChange={changeStatus}
        />
      )}
      {loading && <LoadingState label="Loading orders" />}
      <div className="seller-toolbar">
        <div className="form-group form-group--full">
          <label htmlFor="seller-order-search">Search orders</label>
          <input
            id="seller-order-search"
            className="form-input"
            value={query}
            onChange={(event) => updateFilter(event.target.value, selectedStatus)}
            placeholder="Order number, customer, email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="seller-order-status">Status</label>
          <select
            id="seller-order-status"
            className="form-input"
            value={selectedStatus}
            onChange={(event) => updateFilter(query, event.target.value)}
          >
            {ORDER_STATUS_FILTERS.map((filter) => (
              <option key={filter.value || 'all'} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="button button--ghost" onClick={() => setSearchParams({})}>
          Clear
        </button>
      </div>
      {error && <p className="inline-error">Orders could not be loaded.</p>}
      {status && <p className="inline-error">{status}</p>}
      <div className="seller-table-wrap">
        <table className="seller-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const nextOptions = ORDER_STATUS_TRANSITIONS[order.status] ?? []
              return (
                <tr key={order.id}>
                  <td>
                    <Link to={`/seller/orders?status=${order.status}`}>{order.order_number}</Link>
                  </td>
                  <td>{order.customer_name}</td>
                  <td>{order.status.replaceAll('_', ' ')}</td>
                  <td>€{order.total}</td>
                  <td>
                    {nextOptions.length > 0 && (
                      <select
                        aria-label={`Update status for order ${order.order_number}`}
                        defaultValue=""
                        onChange={(event) => void changeStatus(order.id, event.target.value)}
                      >
                        <option value="">Update</option>
                        {nextOptions.map((option) => (
                          <option value={option} key={option}>
                            {option.replaceAll('_', ' ')}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

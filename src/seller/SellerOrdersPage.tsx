import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { ORDER_STATUS_TRANSITIONS } from '../types/marketplace'

const ORDER_STATUS_FILTERS = [
  { value: '', key: 'sellerAllOrders' },
  { value: 'pending', key: 'sellerPending' },
  { value: 'accepted', key: 'sellerAccepted' },
  { value: 'preparing', key: 'sellerPreparing' },
  { value: 'ready', key: 'sellerReady' },
  { value: 'out_for_delivery', key: 'sellerOutForDelivery' },
  { value: 'completed', key: 'sellerCompleted' },
  { value: 'cancelled', key: 'sellerCancelled' },
  { value: 'rejected', key: 'sellerRejected' },
] as const

export function SellerOrdersPage() {
  const { t } = useTranslation()
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedStatus = searchParams.get('status') ?? ''
  const query = searchParams.get('q') ?? ''
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerOrders({ q: query, status: selectedStatus }),
    [refreshKey, query, selectedStatus],
  )
  const [status, setStatus] = useState('')

  const filteredOrders = useMemo(() => data ?? [], [data])

  const changeStatus = async (id: number, nextStatus: string) => {
    if (!nextStatus) return
    try {
      await marketplaceService.updateSellerOrderStatus(id, nextStatus)
      setRefreshKey((key) => key + 1)
    } catch {
      setStatus(t('sellerUpdateOrderStatusFailed'))
    }
  }

  const updateFilter = (nextQuery: string, nextStatus: string) => {
    const params = new URLSearchParams()
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    if (nextStatus) params.set('status', nextStatus)
    setSearchParams(params)
  }

  if (loading) return <LoadingState label={t('sellerLoadingOrders')} />
  return (
    <section>
      <p className="eyebrow">{t('sellerFulfilment')}</p>
      <h2>{t('sellerOrders')}</h2>
      <div className="seller-toolbar">
        <div className="form-group form-group--full">
          <label htmlFor="seller-order-search">{t('sellerSearchOrders')}</label>
          <input
            id="seller-order-search"
            className="form-input"
            value={query}
            onChange={(event) => updateFilter(event.target.value, selectedStatus)}
            placeholder={t('sellerOrderSearchPlaceholder')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="seller-order-status">{t('sellerStatus')}</label>
          <select
            id="seller-order-status"
            className="form-input"
            value={selectedStatus}
            onChange={(event) => updateFilter(query, event.target.value)}
          >
            {ORDER_STATUS_FILTERS.map((filter) => (
              <option key={filter.value || 'all'} value={filter.value}>
                {t(filter.key)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => setSearchParams({})}
        >
          {t('sellerClear')}
        </button>
      </div>
      {error && <p className="inline-error">{t('sellerOrdersLoadFailed')}</p>}
      {status && <p className="inline-error">{status}</p>}
      <div className="seller-table-wrap">
        <table className="seller-table">
          <thead>
            <tr>
              <th>{t('sellerOrder')}</th>
              <th>{t('sellerCustomer')}</th>
              <th>{t('sellerStatus')}</th>
              <th>{t('sellerTotal')}</th>
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
                  <td>
                    {t(`status_${order.status}`, { defaultValue: order.status.replaceAll('_', ' ') })}
                  </td>
                  <td>€{order.total}</td>
                  <td>
                    {nextOptions.length > 0 && (
                      <select
                        aria-label={t('sellerUpdateStatusForOrder', {
                          number: order.order_number,
                        })}
                        defaultValue=""
                        onChange={(event) => void changeStatus(order.id, event.target.value)}
                      >
                        <option value="">{t('sellerUpdateStatus')}</option>
                        {nextOptions.map((option) => (
                          <option value={option} key={option}>
                            {t(`status_${option}`, { defaultValue: option.replaceAll('_', ' ') })}
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

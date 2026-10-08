import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingState } from '../components/LoadingState'
import { EmptyState } from '../components/EmptyState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import type { BuyerOrder } from '../types/marketplace'

export function BuyerOrdersPage() {
  const { t, i18n } = useTranslation()
  const { data, loading, error } = useMarketplaceData(() => marketplaceService.getBuyerOrders(), [])
  const [orders, setOrders] = useState<BuyerOrder[] | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null)
  const displayOrders = orders ?? data ?? []

  const handleCancel = async (order: BuyerOrder) => {
    if (!window.confirm(t('cancelOrderConfirm'))) return
    setCancellingId(order.id)
    setRowError(null)
    try {
      const updated = await marketplaceService.cancelBuyerOrder(order.id)
      setOrders(displayOrders.map((current) => (current.id === updated.id ? updated : current)))
    } catch (caught) {
      setRowError({
        id: order.id,
        message:
          i18n.language === 'nl'
            ? t('couldNotCancel')
            : caught instanceof Error
              ? caught.message
              : t('couldNotCancel'),
      })
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) return <LoadingState label={t('loadingYourOrders')} />
  if (error) {
    return <EmptyState title={t('ordersUnavailable')} message={t('ordersLoadFailed')} />
  }

  if (displayOrders.length === 0) {
    return (
      <EmptyState
        title={t('noOrdersYet')}
        message={t('ordersAppearHere')}
        action={
          <Link className="btn btn-primary" to="/">
            {t('browseMarketplace')}
          </Link>
        }
      />
    )
  }

  return (
    <section>
      <p className="eyebrow">{t('marketplace')}</p>
      <h2>{t('myOrdersTitle')}</h2>
      <div className="seller-table-wrap">
        <table className="seller-table">
          <thead>
            <tr>
              <th>{t('order')}</th>
              <th>{t('shop')}</th>
              <th>{t('status')}</th>
              <th>{t('total')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {displayOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.order_number}</td>
                <td>{order.shop_name}</td>
                <td>{t(`status_${order.status}`, { defaultValue: order.status.replaceAll('_', ' ') })}</td>
                <td>€{order.total}</td>
                <td>
                  <Link to={`/account/orders/${order.id}`}>{t('viewOrder')}</Link>
                  {order.status === 'pending' && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleCancel(order)}
                        disabled={cancellingId === order.id}
                      >
                        {cancellingId === order.id ? t('cancelling') : t('cancel')}
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

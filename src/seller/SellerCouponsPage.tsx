import { useState, type FormEvent } from 'react'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import type { CouponInput } from '../types/marketplace'

const EMPTY_FORM: CouponInput = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '',
  usage_limit: null,
  active: true,
}

export function SellerCouponsPage() {
  const { data, loading, error, refresh } = useCouponsData()
  const [form, setForm] = useState<CouponInput>(EMPTY_FORM)
  const [status, setStatus] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('Saving…')
    try {
      await marketplaceService.createSellerCoupon({
        ...form,
        min_order_amount: form.min_order_amount || undefined,
        usage_limit: form.usage_limit || null,
      })
      setForm(EMPTY_FORM)
      setStatus('')
      refresh()
    } catch {
      setStatus('Could not create coupon')
    }
  }

  const remove = async (id: number) => {
    if (!window.confirm('Delete this coupon?')) return
    try {
      await marketplaceService.deleteSellerCoupon(id)
      refresh()
    } catch {
      setStatus('Could not delete coupon')
    }
  }

  if (loading) return <LoadingState label="Loading coupons" />

  return (
    <section>
      <p className="eyebrow">Promotions</p>
      <h2>Coupons</h2>
      <div className="seller-form-grid">
        <form className="seller-form" onSubmit={(event) => void submit(event)}>
          <h3>New coupon</h3>
          <label>
            Code
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              required
            />
          </label>
          <label>
            Type
            <select
              value={form.discount_type}
              onChange={(event) =>
                setForm({
                  ...form,
                  discount_type: event.target.value as CouponInput['discount_type'],
                })
              }
            >
              <option value="percentage">percentage</option>
              <option value="fixed">fixed</option>
            </select>
          </label>
          <label>
            Value
            <input
              type="number"
              step="0.01"
              value={form.discount_value}
              onChange={(event) => setForm({ ...form, discount_value: event.target.value })}
              required
            />
          </label>
          <label>
            Minimum order
            <input
              type="number"
              step="0.01"
              value={form.min_order_amount ?? ''}
              onChange={(event) => setForm({ ...form, min_order_amount: event.target.value })}
            />
          </label>
          <label>
            Usage limit
            <input
              type="number"
              step="1"
              value={form.usage_limit ?? ''}
              onChange={(event) =>
                setForm({
                  ...form,
                  usage_limit: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </label>
          <label className="seller-checkbox-row">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Active
          </label>
          <button className="button" type="submit">
            Create
          </button>
          <span role="status">{status}</span>
        </form>
        <div className="seller-content">
          <h3>Existing coupons</h3>
          {error && <p className="inline-error">Coupons could not be loaded.</p>}
          {(data ?? []).length === 0 && <p>No coupons yet.</p>}
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Used</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((coupon) => (
                  <tr key={coupon.id}>
                    <td>{coupon.code}</td>
                    <td>{coupon.discount_type}</td>
                    <td>{coupon.discount_value}</td>
                    <td>{coupon.used_count}</td>
                    <td>{coupon.active ? 'Yes' : 'No'}</td>
                    <td>
                      <button
                        className="button button--danger"
                        type="button"
                        onClick={() => void remove(coupon.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function useCouponsData() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerCoupons(),
    [refreshKey],
  )
  return { data, loading, error, refresh: () => setRefreshKey((key) => key + 1) }
}

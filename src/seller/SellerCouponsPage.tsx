import { useMemo, useState, type FormEvent } from 'react'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import type { Coupon, CouponInput } from '../types/marketplace'

const EMPTY_FORM: CouponInput = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '',
  usage_limit: null,
  active: true,
}

function useCouponsData() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerCoupons(),
    [refreshKey],
  )
  return { data, loading, error, refresh: () => setRefreshKey((key) => key + 1) }
}

function normalizeCouponInput(form: CouponInput): CouponInput {
  return {
    ...form,
    min_order_amount: form.min_order_amount || undefined,
    usage_limit: form.usage_limit ?? null,
  }
}

export function SellerCouponsPage() {
  const { data, loading, error, refresh } = useCouponsData()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<CouponInput>(EMPTY_FORM)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [editForm, setEditForm] = useState<CouponInput>(EMPTY_FORM)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [savingId, setSavingId] = useState<number | null>(null)

  const coupons = useMemo(() => {
    const items = data ?? []
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return items
    return items.filter((coupon) => {
      return (
        coupon.code.toLowerCase().includes(normalizedQuery) ||
        coupon.discount_type.toLowerCase().includes(normalizedQuery) ||
        (coupon.active ? 'active' : 'inactive').includes(normalizedQuery)
      )
    })
  }, [data, query])

  const stats = useMemo(() => {
    const items = data ?? []
    return {
      total: items.length,
      active: items.filter((coupon) => coupon.active).length,
      expired: items.filter((coupon) => !coupon.active).length,
    }
  }, [data])

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    try {
      await marketplaceService.createSellerCoupon(normalizeCouponInput(form))
      setForm(EMPTY_FORM)
      setCreateOpen(false)
      refresh()
      setFeedback({ kind: 'success', message: 'Coupon created' })
    } catch {
      setFeedback({ kind: 'error', message: 'Could not create coupon' })
    }
  }

  const beginEdit = (coupon: Coupon) => {
    setFeedback(null)
    setCreateOpen(false)
    setEditingCoupon(coupon)
    setEditForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || '',
      usage_limit: coupon.usage_limit,
      active: coupon.active,
    })
  }

  const cancelEdit = () => {
    setEditingCoupon(null)
    setEditForm(EMPTY_FORM)
  }

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingCoupon) return
    setSavingId(editingCoupon.id)
    setFeedback(null)
    try {
      await marketplaceService.updateSellerCoupon(editingCoupon.id, normalizeCouponInput(editForm))
      refresh()
      cancelEdit()
      setFeedback({ kind: 'success', message: 'Coupon updated' })
    } catch {
      setFeedback({ kind: 'error', message: 'Could not update coupon' })
    } finally {
      setSavingId(null)
    }
  }

  const remove = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return
    setSavingId(coupon.id)
    setFeedback(null)
    try {
      await marketplaceService.deleteSellerCoupon(coupon.id)
      if (editingCoupon?.id === coupon.id) cancelEdit()
      refresh()
      setFeedback({ kind: 'success', message: 'Coupon deleted' })
    } catch {
      setFeedback({ kind: 'error', message: 'Could not delete coupon' })
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <LoadingState label="Loading coupons" />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Promotions</p>
          <h2>Coupons</h2>
          <p className="muted">Create discount codes and keep a clean list of active offers.</p>
        </div>
        <div className="seller-page-status" aria-label="Coupon counts">
          <span className="status-pill">{stats.total} total</span>
          <span className="status-pill status-pill--success">{stats.active} active</span>
          <span className="status-pill status-pill--muted">{stats.expired} inactive</span>
        </div>
      </div>

      {error && <div className="alert alert--error">Coupons could not be loaded.</div>}
      {feedback && (
        <div className={feedback.kind === 'success' ? 'alert alert--success' : 'alert alert--error'}>
          {feedback.message}
        </div>
      )}

      <div className="seller-toolbar seller-toolbar--compact">
        <div className="form-group form-group--full">
          <label htmlFor="seller-coupon-search">Search coupons</label>
          <input
            id="seller-coupon-search"
            className="form-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Code, type, status"
          />
        </div>
        <button
          type="button"
          className="button"
          onClick={() => {
            setFeedback(null)
            setEditingCoupon(null)
            setCreateOpen((current) => !current)
          }}
        >
          {createOpen ? 'Close add form' : 'Add coupon'}
        </button>
      </div>

      {createOpen && (
        <div className="seller-section-card">
          <div className="seller-section-card__header">
            <div>
              <p className="eyebrow">Add coupon</p>
              <h3>New coupon</h3>
            </div>
          </div>
          <form className="seller-form seller-category-form" onSubmit={(event) => void submitCreate(event)}>
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
            <div className="seller-actions seller-actions--tight">
              <button className="button" type="submit">
                Create coupon
              </button>
            </div>
          </form>
        </div>
      )}

      {editingCoupon && (
        <div className="seller-section-card">
          <div className="seller-section-card__header">
            <div>
              <p className="eyebrow">Edit coupon</p>
              <h3>{editingCoupon.code}</h3>
            </div>
          </div>
          <form className="seller-form seller-category-form" onSubmit={(event) => void submitEdit(event)}>
            <label>
              Code
              <input
                value={editForm.code}
                onChange={(event) => setEditForm({ ...editForm, code: event.target.value })}
                required
              />
            </label>
            <label>
              Type
              <select
                value={editForm.discount_type}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
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
                value={editForm.discount_value}
                onChange={(event) => setEditForm({ ...editForm, discount_value: event.target.value })}
                required
              />
            </label>
            <label>
              Minimum order
              <input
                type="number"
                step="0.01"
                value={editForm.min_order_amount ?? ''}
                onChange={(event) =>
                  setEditForm({ ...editForm, min_order_amount: event.target.value })
                }
              />
            </label>
            <label>
              Usage limit
              <input
                type="number"
                step="1"
                value={editForm.usage_limit ?? ''}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    usage_limit: event.target.value ? Number(event.target.value) : null,
                  })
                }
              />
            </label>
            <label className="seller-checkbox-row">
              <input
                type="checkbox"
                checked={editForm.active}
                onChange={(event) => setEditForm({ ...editForm, active: event.target.checked })}
              />
              Active
            </label>
            <div className="seller-actions seller-actions--tight">
              <button className="button" type="submit" disabled={savingId === editingCoupon.id}>
                {savingId === editingCoupon.id ? 'Saving…' : 'Save coupon'}
              </button>
              <button
                className="button button--ghost"
                type="button"
                disabled={savingId === editingCoupon.id}
                onClick={cancelEdit}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="seller-section-card">
        <div className="seller-section-card__header">
          <div>
            <p className="eyebrow">Coupon list</p>
            <h3>All coupons</h3>
          </div>
          <p className="muted">Use edit to update offer details or delete to retire a code.</p>
        </div>

        {coupons.length === 0 ? (
          <div className="seller-empty-state">
            <h4>No coupons found</h4>
            <p>Adjust the search or create a new coupon.</p>
          </div>
        ) : (
          <div className="seller-table-wrap">
            <table className="seller-table seller-table--actions">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Minimum order</th>
                  <th>Used</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <strong>{coupon.code}</strong>
                    </td>
                    <td>{coupon.discount_type}</td>
                    <td>{coupon.discount_value}</td>
                    <td>{coupon.min_order_amount || '—'}</td>
                    <td>{coupon.used_count}</td>
                    <td>
                      <span
                        className={
                          coupon.active
                            ? 'status-pill status-pill--success'
                            : 'status-pill status-pill--muted'
                        }
                      >
                        {coupon.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="seller-row-actions">
                      <button
                        className="button button--ghost button--small"
                        type="button"
                        disabled={savingId === coupon.id}
                        onClick={() => beginEdit(coupon)}
                      >
                        Edit
                      </button>
                      <button
                        className="button button--danger button--small"
                        type="button"
                        disabled={savingId === coupon.id}
                        onClick={() => void remove(coupon)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

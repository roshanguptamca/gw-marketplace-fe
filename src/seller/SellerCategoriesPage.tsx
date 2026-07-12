import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import type { SellerCategory, SellerCategoryInput } from '../types/marketplace'

const EMPTY_FORM: SellerCategoryInput = {
  name: '',
  is_active: true,
}

function useCategoriesData() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerCategories(),
    [refreshKey],
  )
  return { data, loading, error, refresh: () => setRefreshKey((key) => key + 1) }
}

export function SellerCategoriesPage() {
  const { data, loading, error, refresh } = useCategoriesData()
  const [form, setForm] = useState<SellerCategoryInput>(EMPTY_FORM)
  const [rowState, setRowState] = useState<Record<number, SellerCategoryInput>>({})
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    const nextState = Object.fromEntries(
      (data ?? []).map((category) => [
        category.id,
        {
          name: category.name,
          is_active: category.is_active,
        },
      ]),
    )
    setRowState(nextState)
  }, [data])

  const shopCategories = useMemo(
    () => (data ?? []).filter((category) => !category.is_global),
    [data],
  )
  const globalCategories = useMemo(
    () => (data ?? []).filter((category) => category.is_global),
    [data],
  )

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    try {
      await marketplaceService.createSellerCategory(form)
      setForm(EMPTY_FORM)
      setFeedback({ kind: 'success', message: 'Category created' })
      refresh()
    } catch {
      setFeedback({ kind: 'error', message: 'Could not create category' })
    }
  }

  const handleSave = async (category: SellerCategory) => {
    const current = rowState[category.id]
    if (!current) return
    setSavingId(category.id)
    setFeedback(null)
    try {
      await marketplaceService.updateSellerCategory(category.id, {
        name: current.name,
        is_active: current.is_active,
      })
      setFeedback({ kind: 'success', message: 'Category saved' })
      refresh()
    } catch {
      setFeedback({ kind: 'error', message: 'Could not save category' })
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (category: SellerCategory) => {
    if (!window.confirm(`Delete ${category.name}?`)) return
    setSavingId(category.id)
    setFeedback(null)
    try {
      await marketplaceService.deleteSellerCategory(category.id)
      setFeedback({ kind: 'success', message: 'Category deleted' })
      refresh()
    } catch {
      setFeedback({ kind: 'error', message: 'Could not delete category' })
    } finally {
      setSavingId(null)
    }
  }

  const updateRow = (id: number, patch: Partial<SellerCategoryInput>) => {
    setRowState((prev) => ({
      ...prev,
      [id]: {
        name: prev[id]?.name ?? '',
        is_active: prev[id]?.is_active ?? true,
        ...patch,
      },
    }))
  }

  if (loading) return <LoadingState label="Loading categories" />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Products</p>
          <h2>Categories</h2>
          <p className="muted">Manage the categories shown in your product editor and shop.</p>
        </div>
      </div>

      {error && <div className="alert alert--error">Categories could not be loaded.</div>}
      {feedback && (
        <div className={feedback.kind === 'success' ? 'alert alert--success' : 'alert alert--error'}>
          {feedback.message}
        </div>
      )}

      <div className="seller-form-grid">
        <form className="seller-form" onSubmit={(event) => void handleCreate(event)}>
          <h3>New category</h3>
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label className="seller-checkbox-row">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
            Active
          </label>
          <p className="form-hint">
            Slugs are generated automatically. Global categories are read-only.
          </p>
          <button className="button" type="submit">
            Create
          </button>
        </form>

        <div className="seller-content">
          <h3>Your categories</h3>
          {shopCategories.length === 0 ? (
            <p>No shop categories yet.</p>
          ) : (
            <div className="seller-table-wrap">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {shopCategories.map((category) => {
                    const row = rowState[category.id] ?? {
                      name: category.name,
                      is_active: category.is_active,
                    }
                    return (
                      <tr key={category.id}>
                        <td>
                          <input
                            className="form-input"
                            value={row.name}
                            onChange={(event) =>
                              updateRow(category.id, { name: event.target.value })
                            }
                          />
                        </td>
                        <td>{category.slug}</td>
                        <td>
                          <label className="seller-checkbox-row">
                            <input
                              type="checkbox"
                              checked={row.is_active}
                              onChange={(event) =>
                                updateRow(category.id, { is_active: event.target.checked })
                              }
                            />
                            {row.is_active ? 'Active' : 'Hidden'}
                          </label>
                        </td>
                        <td>
                          <button
                            className="button"
                            type="button"
                            disabled={savingId === category.id}
                            onClick={() => void handleSave(category)}
                          >
                            {savingId === category.id ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                        <td>
                          <button
                            className="button button--danger"
                            type="button"
                            disabled={savingId === category.id}
                            onClick={() => void handleDelete(category)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <h3 style={{ marginTop: '32px' }}>Global categories</h3>
          {globalCategories.length === 0 ? (
            <p>No global categories are available.</p>
          ) : (
            <div className="seller-table-wrap">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th>Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {globalCategories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.name}</td>
                      <td>{category.slug}</td>
                      <td>{category.is_active ? 'Active' : 'Hidden'}</td>
                      <td>
                        <span className="status-pill status-pill--muted">Global</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

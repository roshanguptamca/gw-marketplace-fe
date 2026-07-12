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

function categoryScope(category: SellerCategory) {
  return category.is_global ? 'Global' : 'Shop'
}

export function SellerCategoriesPage() {
  const { data, loading, error, refresh } = useCategoriesData()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<SellerCategoryInput>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<SellerCategoryInput>(EMPTY_FORM)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [savingId, setSavingId] = useState<number | null>(null)

  useEffect(() => {
    if (editingId === null) return
    const current = (data ?? []).find((category) => category.id === editingId)
    if (!current) {
      setEditingId(null)
      setEditForm(EMPTY_FORM)
      return
    }
    setEditForm({
      name: current.name,
      is_active: current.is_active,
    })
  }, [data, editingId])

  const categories = useMemo(() => {
    const items = data ?? []
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return items
    return items.filter((category) => {
      return (
        category.name.toLowerCase().includes(normalizedQuery) ||
        category.slug.toLowerCase().includes(normalizedQuery) ||
        categoryScope(category).toLowerCase().includes(normalizedQuery) ||
        (category.is_active ? 'active' : 'hidden').includes(normalizedQuery)
      )
    })
  }, [data, query])

  const stats = useMemo(() => {
    const items = data ?? []
    return {
      total: items.length,
      shop: items.filter((category) => !category.is_global).length,
      global: items.filter((category) => category.is_global).length,
      active: items.filter((category) => category.is_active).length,
    }
  }, [data])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    try {
      await marketplaceService.createSellerCategory(form)
      setForm(EMPTY_FORM)
      setCreateOpen(false)
      setFeedback({ kind: 'success', message: 'Category created' })
      refresh()
    } catch {
      setFeedback({ kind: 'error', message: 'Could not create category' })
    }
  }

  const beginEdit = (category: SellerCategory) => {
    setFeedback(null)
    setCreateOpen(false)
    setEditingId(category.id)
    setEditForm({
      name: category.name,
      is_active: category.is_active,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }

  const handleSave = async (category: SellerCategory) => {
    if (category.is_global) return
    setSavingId(category.id)
    setFeedback(null)
    try {
      await marketplaceService.updateSellerCategory(category.id, {
        name: editForm.name,
        is_active: editForm.is_active,
      })
      setFeedback({ kind: 'success', message: 'Category updated' })
      cancelEdit()
      refresh()
    } catch {
      setFeedback({ kind: 'error', message: 'Could not update category' })
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (category: SellerCategory) => {
    if (category.is_global) return
    if (!window.confirm(`Delete ${category.name}?`)) return
    setSavingId(category.id)
    setFeedback(null)
    try {
      await marketplaceService.deleteSellerCategory(category.id)
      setFeedback({ kind: 'success', message: 'Category deleted' })
      if (editingId === category.id) cancelEdit()
      refresh()
    } catch {
      setFeedback({ kind: 'error', message: 'Could not delete category' })
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <LoadingState label="Loading categories" />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Products</p>
          <h2>Categories</h2>
          <p className="muted">Create, edit, and clean up the categories used in your shop.</p>
        </div>
        <div className="seller-page-status" aria-label="Category counts">
          <span className="status-pill">{stats.total} total</span>
          <span className="status-pill status-pill--muted">{stats.shop} shop</span>
          <span className="status-pill status-pill--muted">{stats.global} global</span>
          <span className="status-pill status-pill--success">{stats.active} active</span>
        </div>
      </div>

      {error && <div className="alert alert--error">Categories could not be loaded.</div>}
      {feedback && (
        <div className={feedback.kind === 'success' ? 'alert alert--success' : 'alert alert--error'}>
          {feedback.message}
        </div>
      )}

      <div className="seller-toolbar seller-toolbar--compact">
        <div className="form-group form-group--full">
          <label htmlFor="seller-category-search">Search categories</label>
          <input
            id="seller-category-search"
            className="form-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, slug, scope, status"
          />
        </div>
        <button
          type="button"
          className="button"
          onClick={() => {
            setFeedback(null)
            setEditingId(null)
            setCreateOpen((current) => !current)
          }}
        >
          {createOpen ? 'Close add form' : 'Add category'}
        </button>
      </div>

      {createOpen && (
        <div className="seller-section-card">
          <div className="seller-section-card__header">
            <div>
              <p className="eyebrow">Add category</p>
              <h3>New shop category</h3>
            </div>
            <span className="status-pill status-pill--muted">Slugs are generated automatically</span>
          </div>
          <form className="seller-form seller-category-form" onSubmit={(event) => void handleCreate(event)}>
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Example: Bakery"
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
            <div className="seller-actions seller-actions--tight">
              <button className="button" type="submit">
                Create category
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="seller-section-card">
        <div className="seller-section-card__header">
          <div>
            <p className="eyebrow">Category list</p>
            <h3>All categories</h3>
          </div>
          <p className="muted">
            Global categories are read-only. Shop categories can be edited or removed here.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="seller-empty-state">
            <h4>No categories found</h4>
            <p>Adjust the search or add a new category to keep the catalog organized.</p>
          </div>
        ) : (
          <div className="seller-table-wrap">
            <table className="seller-table seller-table--actions">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const isEditing = editingId === category.id
                  const canManage = !category.is_global
                  const current = isEditing
                    ? editForm
                    : {
                        name: category.name,
                        is_active: category.is_active,
                      }
                  return (
                    <tr key={category.id}>
                      <td>
                        {isEditing ? (
                          <input
                            className="form-input seller-inline-input"
                            value={current.name}
                            onChange={(event) =>
                              setEditForm((previous) => ({
                                ...previous,
                                name: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          <strong>{category.name}</strong>
                        )}
                      </td>
                      <td>{category.slug}</td>
                      <td>
                        <span className={category.is_global ? 'status-pill' : 'status-pill status-pill--muted'}>
                          {categoryScope(category)}
                        </span>
                      </td>
                      <td>
                        {isEditing ? (
                          <label className="seller-checkbox-row seller-checkbox-row--compact">
                            <input
                              type="checkbox"
                              checked={current.is_active}
                              onChange={(event) =>
                                setEditForm((previous) => ({
                                  ...previous,
                                  is_active: event.target.checked,
                                }))
                              }
                            />
                            {current.is_active ? 'Active' : 'Hidden'}
                          </label>
                        ) : (
                          <span
                            className={
                              category.is_active
                                ? 'status-pill status-pill--success'
                                : 'status-pill status-pill--muted'
                            }
                          >
                            {category.is_active ? 'Active' : 'Hidden'}
                          </span>
                        )}
                      </td>
                      <td className="seller-row-actions">
                        {isEditing ? (
                          <>
                            <button
                              className="button button--small"
                              type="button"
                              disabled={savingId === category.id}
                              onClick={() => void handleSave(category)}
                            >
                              {savingId === category.id ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              className="button button--ghost button--small"
                              type="button"
                              disabled={savingId === category.id}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="button button--ghost button--small"
                              type="button"
                              disabled={!canManage}
                              onClick={() => beginEdit(category)}
                            >
                              Edit
                            </button>
                            <button
                              className="button button--danger button--small"
                              type="button"
                              disabled={!canManage || savingId === category.id}
                              onClick={() => void handleDelete(category)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="form-hint" style={{ marginTop: '16px' }}>
        Global categories are controlled by GuideWisey. Shop categories stay editable for the
        seller.
      </p>
    </section>
  )
}

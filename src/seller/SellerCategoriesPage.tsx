import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        t(category.is_global ? 'sellerGlobal' : 'sellerShop').toLowerCase().includes(normalizedQuery) ||
        t(category.is_active ? 'sellerActive' : 'sellerHidden').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [data, query, t])

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
      setFeedback({ kind: 'success', message: t('sellerCategoryCreated') })
      refresh()
    } catch {
      setFeedback({ kind: 'error', message: t('sellerCategoryCreateFailed') })
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
      setFeedback({ kind: 'success', message: t('sellerCategoryUpdated') })
      cancelEdit()
      refresh()
    } catch {
      setFeedback({ kind: 'error', message: t('sellerCategoryUpdateFailed') })
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (category: SellerCategory) => {
    if (category.is_global) return
    if (!window.confirm(t('sellerCategoryConfirm', { name: category.name }))) return
    setSavingId(category.id)
    setFeedback(null)
    try {
      await marketplaceService.deleteSellerCategory(category.id)
      setFeedback({ kind: 'success', message: t('sellerCategoryDeleted') })
      if (editingId === category.id) cancelEdit()
      refresh()
    } catch {
      setFeedback({ kind: 'error', message: t('sellerCategoryDeleteFailed') })
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <LoadingState label={t('sellerCategories')} />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">{t('sellerProducts')}</p>
          <h2>{t('sellerCategories')}</h2>
          <p className="muted">{t('sellerManageCategoriesIntro')}</p>
        </div>
        <div className="seller-page-status" aria-label={t('sellerCategoryCounts')}>
          <span className="status-pill">{t('sellerCategoryTotalCount', { count: stats.total })}</span>
          <span className="status-pill status-pill--muted">{t('sellerCategoryShopCount', { count: stats.shop })}</span>
          <span className="status-pill status-pill--muted">{t('sellerCategoryGlobalCount', { count: stats.global })}</span>
          <span className="status-pill status-pill--success">{t('sellerCategoryActiveCount', { count: stats.active })}</span>
        </div>
      </div>

      {error && <div className="alert alert--error">{t('sellerCategoriesLoadFailed')}</div>}
      {feedback && (
        <div className={feedback.kind === 'success' ? 'alert alert--success' : 'alert alert--error'}>
          {feedback.message}
        </div>
      )}

      <div className="seller-toolbar seller-toolbar--compact">
        <div className="form-group form-group--full">
          <label htmlFor="seller-category-search">{t('sellerSearchCategories')}</label>
          <input
            id="seller-category-search"
            className="form-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('sellerCategorySearchPlaceholder')}
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
          {createOpen ? t('sellerCloseAddForm') : t('sellerAddCategory')}
        </button>
      </div>

      {createOpen && (
        <div className="seller-section-card">
          <div className="seller-section-card__header">
            <div>
              <p className="eyebrow">{t('sellerAddCategory')}</p>
              <h3>{t('sellerNewCategory')}</h3>
            </div>
            <span className="status-pill status-pill--muted">{t('sellerSlugsGenerated')}</span>
          </div>
          <form className="seller-form seller-category-form" onSubmit={(event) => void handleCreate(event)}>
            <label>
              {t('sellerCategoryName')}
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder={t('sellerExampleBakery')}
                required
              />
            </label>
            <label className="seller-checkbox-row">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              {t('sellerActive')}
            </label>
            <div className="seller-actions seller-actions--tight">
              <button className="button" type="submit">
                {t('sellerCreateCategory')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="seller-section-card">
        <div className="seller-section-card__header">
          <div>
            <p className="eyebrow">{t('sellerCategoryList')}</p>
            <h3>{t('sellerAllCategories')}</h3>
          </div>
          <p className="muted">{t('sellerCategoryReadOnly')}</p>
        </div>

        {categories.length === 0 ? (
          <div className="seller-empty-state">
            <h4>{t('sellerNoCategories')}</h4>
            <p>{t('sellerAdjustCategorySearch')}</p>
          </div>
        ) : (
          <div className="seller-table-wrap">
            <table className="seller-table seller-table--actions">
              <thead>
                <tr>
                  <th>{t('sellerCategoryName')}</th>
                  <th>{t('sellerCategorySlug')}</th>
                  <th>{t('sellerCategoryScope')}</th>
                  <th>{t('sellerStatus')}</th>
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
                        <span
                          className={
                            category.is_global ? 'status-pill' : 'status-pill status-pill--muted'
                          }
                        >
                          {t(category.is_global ? 'sellerGlobal' : 'sellerShop')}
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
                            {t(current.is_active ? 'sellerActive' : 'sellerHidden')}
                          </label>
                        ) : (
                          <span
                            className={
                              category.is_active
                                ? 'status-pill status-pill--success'
                                : 'status-pill status-pill--muted'
                            }
                          >
                            {t(category.is_active ? 'sellerActive' : 'sellerHidden')}
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
                              {savingId === category.id ? t('sellerSaving') : t('sellerSave')}
                            </button>
                            <button
                              className="button button--ghost button--small"
                              type="button"
                              disabled={savingId === category.id}
                              onClick={cancelEdit}
                            >
                              {t('sellerCancel')}
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
                              {t('sellerEdit')}
                            </button>
                            <button
                              className="button button--danger button--small"
                              type="button"
                              disabled={!canManage || savingId === category.id}
                              onClick={() => void handleDelete(category)}
                            >
                              {t('sellerDeleteButton')}
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
        {t('sellerGlobalCategoryNote')}
      </p>
    </section>
  )
}

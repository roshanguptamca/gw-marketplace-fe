import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { shopPageService } from '../services/shopPageService'
import { getApiErrorMessage } from '../services/apiClient'
import type { ShopPage, ShopPageInput } from '../types/marketplace'
import { shopPath } from '../utils/shopLinks'

const emptyPage = (): ShopPageInput => ({
  title: '',
  slug: '',
  kind: 'menu',
  description: '',
  fulfilment_notes: '',
  cover_url: '',
  is_published: false,
  is_featured: false,
  position: 0,
  order_deadline: null,
  product_ids: [],
})
function localDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function pageInput(page: ShopPage): ShopPageInput {
  return {
    title: page.title,
    slug: page.slug,
    kind: page.kind,
    description: page.description,
    fulfilment_notes: page.fulfilment_notes,
    cover_url: page.cover_url,
    is_published: page.is_published,
    is_featured: page.is_featured,
    position: page.position,
    order_deadline: page.order_deadline,
    product_ids: page.product_ids,
  }
}
export function SellerPagesPage() {
  const { t, i18n } = useTranslation()
  const [refresh, setRefresh] = useState(0)
  const data = useMarketplaceData(async () => {
    const [pages, products, shop, enquiries] = await Promise.all([
      shopPageService.list(),
      marketplaceService.getSellerProducts(),
      marketplaceService.getSellerShop(),
      shopPageService.enquiries(),
    ])
    return { pages, products, shop, enquiries }
  }, [refresh])
  const [form, setForm] = useState<ShopPageInput | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null)
  const editor = useRef<HTMLDivElement>(null)
  const start = (page?: ShopPage, duplicate = false) => {
    setEditingId(page && !duplicate ? page.id : null)
    setForm(
      page
        ? {
            ...pageInput(page),
            ...(duplicate
              ? {
                  title: `${page.title} (copy)`,
                  slug: `${page.slug.slice(0, 60)}-copy-${Date.now().toString(36)}`,
                  is_published: false,
                  is_featured: false,
                }
              : {}),
          }
        : emptyPage(),
    )
    setFeedback(null)
    window.setTimeout(() => {
      editor.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
      editor.current?.querySelector('input')?.focus({ preventScroll: true })
    }, 0)
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!form || busy) return
    setBusy(true)
    setFeedback(null)
    try {
      if (editingId) await shopPageService.update(editingId, form)
      else await shopPageService.create(form)
      setForm(null)
      setEditingId(null)
      setRefresh((key) => key + 1)
      setFeedback({ error: false, text: t('pageSaved') })
    } catch (error) {
      setFeedback({ error: true, text: getApiErrorMessage(error, t('pageSaveFailed')) })
    } finally {
      setBusy(false)
    }
  }
  async function remove(page: ShopPage) {
    if (!window.confirm(t('deletePageConfirm', { title: page.title }))) return
    setBusy(true)
    setFeedback(null)
    try {
      await shopPageService.remove(page.id)
      setRefresh((key) => key + 1)
      setFeedback({ error: false, text: t('pageDeleted') })
    } catch (error) {
      setFeedback({ error: true, text: getApiErrorMessage(error, t('pageDeleteFailed')) })
    } finally {
      setBusy(false)
    }
  }
  if (data.loading) return <LoadingState label={t('pagesMenus')} />
  if (data.error || !data.data)
    return (
      <section>
        <p className="alert alert--error" role="alert">
          {t('pagesLoadError')}
        </p>
        <button className="button" onClick={() => setRefresh((key) => key + 1)}>
          {t('retryPages')}
        </button>
      </section>
    )
  const { pages, products, shop, enquiries } = data.data
  return (
    <section>
      <div className="seller-page-header">
        <div>
          <h2>{t('pagesMenus')}</h2>
          <p className="muted">{t('pagesIntro')}</p>
        </div>
        <button className="button" disabled={busy || !!form} onClick={() => start()}>
          {t('createPage')}
        </button>
      </div>
      {feedback && (
        <p
          className={`alert alert--${feedback.error ? 'error' : 'success'}`}
          role={feedback.error ? 'alert' : 'status'}
        >
          {feedback.text}
        </p>
      )}
      {form && (
        <div className="seller-section-card page-editor" ref={editor}>
          <h3>{t(editingId ? 'editPage' : 'createPage')}</h3>
          <form className="seller-form" onSubmit={(event) => void save(event)}>
            <fieldset disabled={busy}>
              <label>
                {t('pageTitle')}
                <input
                  required
                  maxLength={100}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label>
                {t('pageSlug')}
                <input
                  required
                  maxLength={80}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  aria-describedby="page-slug-hint"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </label>
              <p className="form-hint" id="page-slug-hint">
                {t('pageSlugHint')}
              </p>
              <label>
                {t('pageKind')}
                <select
                  value={form.kind}
                  onChange={(e) =>
                    setForm({ ...form, kind: e.target.value as ShopPageInput['kind'] })
                  }
                >
                  <option value="menu">{t('menuKind')}</option>
                  <option value="enquiry">{t('enquiryKind')}</option>
                  <option value="information">{t('informationKind')}</option>
                </select>
              </label>
              <label>
                {t('pageDescription')}
                <textarea
                  rows={4}
                  maxLength={6000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label>
                {t('fulfilmentNotes')}
                <textarea
                  rows={2}
                  maxLength={500}
                  value={form.fulfilment_notes}
                  onChange={(e) => setForm({ ...form, fulfilment_notes: e.target.value })}
                />
              </label>
              <label>
                {t('coverUrl')}
                <input
                  type="url"
                  maxLength={500}
                  pattern="https://.*"
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                />
              </label>
              <label>
                {t('pagePosition')}
                <input
                  type="number"
                  min={0}
                  max={32767}
                  required
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: Number(e.target.value) })}
                />
              </label>
              {form.kind !== 'information' && (
                <label>
                  {t('pageDeadline')}
                  <input
                    type="datetime-local"
                    value={localDateTime(form.order_deadline)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        order_deadline: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                </label>
              )}
              {form.kind !== 'information' && (
                <fieldset className="page-product-picker">
                  <legend>{t('pageProducts')}</legend>
                  <p className="form-hint">{t('pageProductsHint')}</p>
                  {products.map((product) => (
                    <label className="seller-checkbox-row" key={product.id}>
                      <input
                        type="checkbox"
                        checked={form.product_ids.includes(product.id)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            product_ids: e.target.checked
                              ? [...form.product_ids, product.id]
                              : form.product_ids.filter((id) => id !== product.id),
                          })
                        }
                      />
                      {product.name}
                    </label>
                  ))}
                </fieldset>
              )}
              <label className="seller-checkbox-row">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                />
                {t('pagePublished')}
              </label>
              <label className="seller-checkbox-row">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                />
                {t('pageFeatured')}
              </label>
              <div className="seller-actions">
                <button type="submit" className="button">
                  {t(busy ? 'savingPage' : 'savePage')}
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setForm(null)}
                >
                  {t('cancelPage')}
                </button>
              </div>
            </fieldset>
          </form>
        </div>
      )}
      <div className="seller-pages-list">
        {!pages.length && <p className="seller-empty-state">{t('noSellerPages')}</p>}
        {pages.map((page) => (
          <article className="seller-section-card seller-page-card" key={page.id}>
            <div>
              <h3>{page.title}</h3>
              <p className="muted">
                {page.slug} ·{' '}
                {t(
                  page.kind === 'menu'
                    ? 'menuKind'
                    : page.kind === 'enquiry'
                      ? 'enquiryKind'
                      : 'informationKind',
                )}
              </p>
              <span className={`status-pill ${page.is_published ? 'status-pill--success' : ''}`}>
                {t(page.is_published ? 'publishedPage' : 'draftPage')}
              </span>
            </div>
            <div className="seller-actions">
              <button
                className="button button--ghost"
                disabled={busy || !!form}
                onClick={() => start(page)}
              >
                {t('editPage')}
              </button>
              <button
                className="button button--ghost"
                disabled={busy || !!form}
                onClick={() => start(page, true)}
              >
                {t('duplicatePage')}
              </button>
              {page.is_published && (
                <Link
                  className="button button--ghost"
                  to={shopPath(shop.slug, `/pages/${page.slug}`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('openPage')} ↗
                </Link>
              )}
              <button
                className="button button--danger"
                disabled={busy || !!form}
                onClick={() => void remove(page)}
              >
                {t('deletePage')}
              </button>
            </div>
          </article>
        ))}
      </div>
      <section className="seller-page-enquiries" aria-labelledby="enquiries-heading">
        <h3 id="enquiries-heading">{t('sellerEnquiries')}</h3>
        <p className="muted">{t('enquiriesHint')}</p>
        {!enquiries.length && <p>{t('noEnquiries')}</p>}
        {enquiries.map((enquiry) => (
          <article className="seller-section-card" key={enquiry.id}>
            <h4>
              {t('enquiryNumber', { id: enquiry.id })} · {enquiry.page_title}
            </h4>
            <p>
              {enquiry.customer_name} · {enquiry.event_date} ·{' '}
              {t('pageGuests', { count: enquiry.guests })}
            </p>
            <p>{new Date(enquiry.created_at).toLocaleString(i18n.language)}</p>
            <p>
              <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
              {enquiry.phone && (
                <>
                  {' '}
                  · <a href={`tel:${enquiry.phone.replace(/[^+\d]/g, '')}`}>{enquiry.phone}</a>
                </>
              )}
            </p>
            {enquiry.product_ids.length > 0 && (
              <p>
                {t('dishPreferences')}:{' '}
                {enquiry.product_ids
                  .map((id) => products.find((product) => product.id === id)?.name ?? `#${id}`)
                  .join(', ')}
              </p>
            )}
            <p className="custom-page-description">{enquiry.message}</p>
          </article>
        ))}
      </section>
    </section>
  )
}

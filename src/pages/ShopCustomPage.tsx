import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCart } from '../cart/CartContext'
import { ShopPageNavigation } from '../components/ShopPageNavigation'
import { ShopHero } from '../components/ShopHero'
import { ShopDetailsModal } from '../components/ShopDetailsModal'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { shopPageService } from '../services/shopPageService'
import { ApiError, getApiErrorMessage } from '../services/apiClient'
import { env } from '../config/env'
import { formatPrice, shopPath } from '../utils/shopLinks'
import { getFirstProductImageUrl, handleProductImageError } from '../utils/productImages'
import { effectiveMinimumQuantity, sellingFormatLabel } from '../utils/productUnits'
import type { Product, ShopEnquiryInput, ShopPage } from '../types/marketplace'

function useOrderingOpen(page: ShopPage) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])
  return page.ordering_open && (!page.order_deadline || Date.parse(page.order_deadline) > now)
}

function MenuItems({ products, open }: { products: Product[]; open: boolean }) {
  const { t } = useTranslation()
  const { items, addItem, updateQuantity, removeItem } = useCart()
  return (
    <div className="menu-items">
      {products.map((product) => {
        const quantity = items.find((item) => item.product.id === product.id)?.quantity ?? 0
        const minimum = effectiveMinimumQuantity(product)
        const available =
          open && product.sellerAcceptingOrders !== false && product.stock >= minimum
        return (
          <article className="menu-item" key={product.id}>
            <Link to={shopPath(product.shopSlug, `/products/${product.id}`)}>
              <img
                src={getFirstProductImageUrl(product.images)}
                alt={product.name}
                onError={handleProductImageError}
              />
            </Link>
            <div className="menu-item__copy">
              <h3>{product.name}</h3>
              <p>{sellingFormatLabel(product)}</p>
              <strong>{formatPrice(product.price, product.currency)}</strong>
              {product.allergens && (
                <p>
                  {t('allergens')}: {product.allergens}
                </p>
              )}
            </div>
            {available ? (
              <div
                className="menu-stepper"
                role="group"
                aria-label={t('menuQuantity', { name: product.name })}
              >
                <button
                  type="button"
                  disabled={!quantity}
                  aria-label={t('decreaseDish', { name: product.name })}
                  onClick={() =>
                    quantity <= minimum
                      ? removeItem(product.id)
                      : updateQuantity(product.id, quantity - 1)
                  }
                >
                  −
                </button>
                <output aria-live="polite">{quantity}</output>
                <button
                  type="button"
                  disabled={quantity >= product.stock}
                  aria-label={t('increaseDish', { name: product.name })}
                  onClick={() => addItem(product)}
                >
                  +
                </button>
              </div>
            ) : (
              <span className="status-pill">
                {t(open ? 'pageProductUnavailable' : 'ordersClosed')}
              </span>
            )}
          </article>
        )
      })}
      {!products.length && <p className="muted">{t('noMenuProducts')}</p>}
      {items.length > 0 && (
        <div className="menu-basket">
          <Link className="button" to="/cart">
            {t('menuCart')} →
          </Link>
        </div>
      )}
    </div>
  )
}

function QuoteForm({
  shopSlug,
  page,
  products,
}: {
  shopSlug: string
  page: ShopPage
  products: Product[]
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<ShopEnquiryInput>({
    customer_name: '',
    email: '',
    phone: '',
    event_date: '',
    guests: 10,
    message: '',
    product_ids: [],
    privacy_accepted: false,
  })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await shopPageService.enquire(shopSlug, page.slug, form)
      setSent(true)
    } catch (error) {
      setError(getApiErrorMessage(error, t('quoteFailed')))
    } finally {
      setBusy(false)
    }
  }
  if (sent)
    return (
      <div className="alert alert--success" role="status">
        <h3>{t('quoteSent')}</h3>
        <p>{t('quoteSentHint')}</p>
      </div>
    )
  // Use the customer's local date rather than UTC near midnight.
  const today = new Date()
  const dateMin = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return (
    <form className="seller-form quote-form" onSubmit={(event) => void submit(event)}>
      <h3>{t('requestQuote')}</h3>
      <p>{t('quoteIntro')}</p>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={busy}>
        <label>
          {t('customerName')}
          <input
            autoComplete="name"
            required
            maxLength={100}
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          />
        </label>
        <label>
          {t('customerEmail')}
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          {t('customerPhone')}
          <input
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <label>
          {t('eventDate')}
          <input
            type="date"
            required
            min={dateMin}
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
          />
        </label>
        <label>
          {t('guestCount')}
          <input
            type="number"
            required
            min={1}
            max={10000}
            step={1}
            value={form.guests}
            onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
          />
        </label>
        {!!products.length && (
          <fieldset>
            <legend>{t('dishPreferences')}</legend>
            {products.map((product) => (
              <label className="seller-checkbox-row" key={product.id}>
                <input
                  type="checkbox"
                  checked={form.product_ids.includes(Number(product.id))}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      product_ids: e.target.checked
                        ? [...form.product_ids, Number(product.id)]
                        : form.product_ids.filter((id) => id !== Number(product.id)),
                    })
                  }
                />
                {product.name}
              </label>
            ))}
          </fieldset>
        )}
        <label>
          {t('eventMessage')}
          <textarea
            rows={4}
            maxLength={4000}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </label>
        <label className="seller-checkbox-row">
          <input
            type="checkbox"
            required
            checked={form.privacy_accepted}
            onChange={(e) => setForm({ ...form, privacy_accepted: e.target.checked })}
          />
          {t('enquiryConsent')}
        </label>
        <a href={env.privacyUrl} target="_blank" rel="noreferrer">
          {t('privacyPolicy')}
        </a>
        <div>
          <button className="button" type="submit">
            {t(busy ? 'sendingQuote' : 'submitQuote')}
          </button>
        </div>
      </fieldset>
    </form>
  )
}

function PageContent({
  page,
  shopSlug,
  products,
  acceptingOrders,
}: {
  page: ShopPage
  shopSlug: string
  products: Product[]
  acceptingOrders: boolean
}) {
  const { t, i18n } = useTranslation()
  const open = useOrderingOpen(page) && acceptingOrders
  const selectedProducts = products.filter((product) =>
    page.product_ids.includes(Number(product.id)),
  )
  return (
    <>
      {page.cover_url && <img className="custom-page-cover" src={page.cover_url} alt="" />}
      <h2>{page.title}</h2>
      {page.description && <p className="custom-page-description">{page.description}</p>}
      {page.fulfilment_notes && <p className="custom-page-notes">{page.fulfilment_notes}</p>}
      {page.order_deadline && (
        <p>
          {t('orderBy', {
            date: new Date(page.order_deadline).toLocaleString(
              i18n.language === 'nl' ? 'nl-NL' : 'en-GB',
              { dateStyle: 'medium', timeStyle: 'short' },
            ),
          })}
        </p>
      )}
      {page.kind !== 'information' && !open && (
        <p className="alert" role="status">
          {t('ordersClosed')}
        </p>
      )}
      {page.kind === 'menu' && <MenuItems products={selectedProducts} open={open} />}
      {page.kind === 'enquiry' && open && (
        <QuoteForm key={page.id} shopSlug={shopSlug} page={page} products={selectedProducts} />
      )}
    </>
  )
}

export function ShopCustomPage({ resolvedSlug }: { resolvedSlug?: string }) {
  const { shopSlug = '', pageSlug = '' } = useParams()
  const slug = resolvedSlug ?? shopSlug
  const { t } = useTranslation()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [retry, setRetry] = useState(0)
  const state = useMarketplaceData(async () => {
    const [shop, page, products] = await Promise.all([
      marketplaceService.getShopBySlug(slug),
      shopPageService.getPublic(slug, pageSlug),
      marketplaceService.getShopProducts(slug),
    ])
    return { shop, page, products }
  }, [slug, pageSlug, retry])
  if (state.loading) return <LoadingState label={t('openingShop')} />
  if (state.error || !state.data?.shop || !state.data.page.is_published) {
    const unavailable =
      !state.error || (state.error instanceof ApiError && state.error.status === 404)
    return (
      <main className="page-shell section">
        <h1>{t(unavailable ? 'pageNotFound' : 'pageContentError')}</h1>
        <p>{unavailable ? t('pageNotFoundHint') : ''}</p>
        {!unavailable && (
          <button className="button" onClick={() => setRetry((key) => key + 1)}>
            {t('retryPages')}
          </button>
        )}
        <Link className="back-link" to={shopPath(slug)}>
          {t('backToProducts')}
        </Link>
      </main>
    )
  }
  const { shop, page, products } = state.data
  return (
    <main className="shop-storefront">
      <div className="page-shell shop-storefront__navigation">
        <Link className="back-link" to={shopPath(slug)}>
          ← {t('backToProducts')}
        </Link>
      </div>
      <ShopHero shop={shop} onMoreDetails={() => setDetailsOpen(true)} />
      <ShopDetailsModal shop={shop} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
      <ShopPageNavigation shopSlug={slug} activeSlug={pageSlug} />
      <section className="page-shell section custom-shop-page">
        <PageContent
          key={`${slug}/${pageSlug}`}
          page={page}
          shopSlug={slug}
          products={products}
          acceptingOrders={shop.acceptingOrders !== false}
        />
      </section>
    </main>
  )
}

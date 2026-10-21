import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { getApiErrorMessage } from '../services/apiClient'
import type { MenuPreparationReport, ScheduledMenu, ScheduledMenuInput } from '../types/marketplace'
import { menuDate } from '../components/ScheduledMenus'

const empty: ScheduledMenuInput = {
  title: '',
  description: '',
  products: [],
  pickup_date: '',
  pickup_start: '16:00',
  pickup_end: '19:00',
  order_deadline: '',
  slot_minutes: 30,
  capacity: 40,
  slot_capacity: 10,
  active: false,
}
function localDateTime(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}
export function downloadMenuCsv(filename: string, rows: unknown[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          let text = String(value ?? '')
          if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`
          return `"${text.replaceAll('"', '""')}"`
        })
        .join(','),
    )
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function SellerScheduledMenusPage() {
  const { t, i18n } = useTranslation()
  const [reload, setReload] = useState(0)
  const {
    data: menus,
    loading,
    error,
  } = useMarketplaceData(() => marketplaceService.getSellerScheduledMenus(), [reload])
  const { data: products } = useMarketplaceData(() => marketplaceService.getSellerProducts(), [])
  const { data: settings } = useMarketplaceData(() => marketplaceService.getSellerSettings(), [])
  const [form, setForm] = useState<ScheduledMenuInput>({ ...empty, products: [] })
  const [editing, setEditing] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [report, setReport] = useState<MenuPreparationReport | null>(null)
  const tz =
    menus?.find((menu) => menu.id === editing)?.timezone ||
    settings?.pickupTimezone ||
    'Europe/Amsterdam'
  function edit(menu: ScheduledMenu) {
    setEditing(menu.id)
    setForm({
      title: menu.title,
      description: menu.description,
      products: menu.products,
      pickup_date: menu.pickup_date,
      pickup_start: menu.pickup_start.slice(0, 5),
      pickup_end: menu.pickup_end.slice(0, 5),
      order_deadline: localDateTime(menu.order_deadline, menu.timezone),
      slot_minutes: menu.slot_minutes,
      capacity: menu.capacity,
      slot_capacity: menu.slot_capacity,
      active: menu.active,
    })
    setFormOpen(true)
    setFeedback('')
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    setFeedback('')
    if (!form.products.length) {
      setFeedback(t('menus.selectProducts'))
      return
    }
    setBusy(true)
    try {
      if (editing) await marketplaceService.updateScheduledMenu(editing, form)
      else await marketplaceService.createScheduledMenu(form)
      setFormOpen(false)
      setReport(null)
      setReload((n) => n + 1)
      setFeedback(t('menus.saved'))
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t('menus.failed')))
    } finally {
      setBusy(false)
    }
  }
  async function toggle(menu: ScheduledMenu) {
    setBusy(true)
    setFeedback('')
    try {
      await marketplaceService.updateScheduledMenu(menu.id, { active: !menu.active })
      setReport(null)
      setReload((n) => n + 1)
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t('menus.failed')))
    } finally {
      setBusy(false)
    }
  }
  async function loadReport(id: number) {
    setBusy(true)
    setReport(null)
    setFeedback('')
    try {
      setReport(await marketplaceService.getMenuPreparation(id))
    } catch (err) {
      setFeedback(getApiErrorMessage(err, t('menus.failed')))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <h1>{t('menus.title')}</h1>
          <p>{t('menus.sellerIntro')}</p>
        </div>
        <button
          className="button"
          onClick={() => {
            setEditing(null)
            setForm({ ...empty, products: [] })
            setFormOpen(true)
            setFeedback('')
          }}
        >
          {t('menus.create')}
        </button>
      </div>
      {feedback && (
        <p role="status" className="inline-note">
          {feedback}
        </p>
      )}
      {formOpen && (
        <form className="scheduled-menu-card scheduled-menu-form" onSubmit={(e) => void save(e)}>
          <h2>{t(editing ? 'menus.edit' : 'menus.create')}</h2>
          <p>{t('menus.timezone', { timezone: tz })}</p>
          <label>
            {t('menus.name')}
            <input
              required
              maxLength={150}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            {t('menus.description')}
            <textarea
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="form-grid">
            <label>
              {t('pickupDate')}
              <input
                type="date"
                required
                value={form.pickup_date}
                onChange={(e) => setForm({ ...form, pickup_date: e.target.value })}
              />
            </label>
            <label>
              {t('menus.deadline')}
              <input
                type="datetime-local"
                required
                value={form.order_deadline}
                onChange={(e) => setForm({ ...form, order_deadline: e.target.value })}
              />
            </label>
            <label>
              {t('menus.pickupStart')}
              <input
                type="time"
                required
                value={form.pickup_start}
                onChange={(e) => setForm({ ...form, pickup_start: e.target.value })}
              />
            </label>
            <label>
              {t('menus.pickupEnd')}
              <input
                type="time"
                required
                value={form.pickup_end}
                onChange={(e) => setForm({ ...form, pickup_end: e.target.value })}
              />
            </label>
            <label>
              {t('menus.slotMinutes')}
              <input
                type="number"
                min={5}
                max={240}
                required
                value={form.slot_minutes}
                onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })}
              />
            </label>
            <label>
              {t('menus.capacity')}
              <input
                type="number"
                min={1}
                max={100000}
                required
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              />
            </label>
            <label>
              {t('menus.slotCapacity')}
              <input
                type="number"
                min={1}
                max={10000}
                required
                value={form.slot_capacity}
                onChange={(e) => setForm({ ...form, slot_capacity: Number(e.target.value) })}
              />
            </label>
          </div>
          <p className="inline-note">{t('menus.capacityHint')}</p>
          <fieldset className="menu-product-options">
            <legend>{t('menus.products')}</legend>
            {!products && <p>{t('loadingProducts')}</p>}
            {products
              ?.filter((p) => p.is_active && p.is_approved)
              .map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={form.products.includes(p.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        products: e.target.checked
                          ? [...form.products, p.id]
                          : form.products.filter((id) => id !== p.id),
                      })
                    }
                  />
                  {p.name}
                </label>
              ))}
          </fieldset>
          <label className="menu-check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            {t('menus.publish')}
          </label>
          <p className="inline-note">{t('menus.editHint')}</p>
          <div className="menu-actions">
            <button className="button" disabled={busy || !products || !settings}>
              {t('sellerSaveChanges')}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setFormOpen(false)}
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}
      {loading && <p>{t('menus.loading')}</p>}
      {error && <p role="alert">{t('menus.failed')}</p>}
      {!loading && !error && !menus?.length && <p>{t('menus.empty')}</p>}
      <div className="scheduled-menu-grid">
        {menus?.map((menu) => (
          <article className="scheduled-menu-card" key={menu.id}>
            <p className="eyebrow">
              {menu.pickup_date} · {menu.pickup_start.slice(0, 5)}–{menu.pickup_end.slice(0, 5)}
            </p>
            <h2>{menu.title}</h2>
            <p>
              {t('menus.deadline')}: {menuDate(menu.order_deadline, menu.timezone, i18n.language)}
            </p>
            <p>
              {t(menu.is_open ? 'menus.open' : 'menus.closed')} ·{' '}
              {t('menus.remaining', { count: menu.remaining_capacity })}
            </p>
            <div className="menu-actions">
              <button
                type="button"
                className="button button--ghost"
                disabled={busy}
                onClick={() => edit(menu)}
              >
                {t('menus.edit')}
              </button>
              <button
                type="button"
                className="button button--ghost"
                disabled={busy}
                onClick={() => void toggle(menu)}
              >
                {t(menu.active ? 'menus.pause' : 'menus.publish')}
              </button>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => void loadReport(menu.id)}
              >
                {t('menus.report')}
              </button>
            </div>
          </article>
        ))}
      </div>
      {report && (
        <div className="scheduled-menu-card menu-report">
          <h2>
            {report.menu.title} — {t('menus.report')}
          </h2>
          <p>
            {report.menu.pickup_date} · {report.menu.timezone}
          </p>
          <p>{t('menus.pendingHint')}</p>
          <div className="menu-actions">
            <button
              className="button button--ghost"
              onClick={() =>
                downloadMenuCsv(`menu-${report.menu.id}-preparation.csv`, [
                  [
                    t('menus.product'),
                    'SKU',
                    t('menus.quantity'),
                    t('menus.unit'),
                    t('menus.pieces'),
                    t('menus.weight'),
                    t('menus.weightUnit'),
                    t('menus.status'),
                  ],
                  ...report.confirmed_quantities.map((q) => [
                    q.product_name,
                    q.sku,
                    q.quantity,
                    q.selling_unit,
                    q.physical_quantity,
                    q.total_weight_value,
                    q.weight_unit,
                    t('menus.confirmed'),
                  ]),
                  ...report.pending_quantities.map((q) => [
                    q.product_name,
                    q.sku,
                    q.quantity,
                    q.selling_unit,
                    q.physical_quantity,
                    q.total_weight_value,
                    q.weight_unit,
                    t('menus.pending'),
                  ]),
                ])
              }
            >
              {t('menus.exportPrep')}
            </button>
            <button
              className="button button--ghost"
              onClick={() =>
                downloadMenuCsv(`menu-${report.menu.id}-pickups.csv`, [
                  [
                    t('menus.order'),
                    t('menus.customer'),
                    t('pickupTime'),
                    t('menus.items'),
                    t('menus.status'),
                    t('menus.payment'),
                  ],
                  ...report.pickups.map((o) => [
                    o.order_number,
                    o.customer_name,
                    menuDate(o.pickup_slot_start, report.menu.timezone, i18n.language),
                    o.items.map((i) => `${i.quantity} × ${i.product_name}`).join('; '),
                    o.status,
                    o.payment_status,
                  ]),
                ])
              }
            >
              {t('menus.exportPickups')}
            </button>
          </div>
          {[
            ['menus.confirmed', report.confirmed_quantities],
            ['menus.pending', report.pending_quantities],
          ].map(([key, rows]) => (
            <div key={key as string}>
              <h3>{t(key as string)}</h3>
              <div className="menu-report-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t('menus.product')}</th>
                      <th>{t('menus.quantity')}</th>
                      <th>{t('menus.unit')}</th>
                      <th>{t('menus.pieces')}</th>
                      <th>{t('menus.weight')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rows as MenuPreparationReport['confirmed_quantities']).map((q, i) => (
                      <tr key={i}>
                        <td>
                          {q.product_name}
                          <small>{q.sku}</small>
                        </td>
                        <td>{q.quantity}</td>
                        <td>{q.selling_unit || '—'}</td>
                        <td>{q.physical_quantity ?? '—'}</td>
                        <td>
                          {q.total_weight_value ? `${q.total_weight_value} ${q.weight_unit}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <h3>{t('menus.pickups')}</h3>
          <div className="menu-pickups">
            {report.pickups.map((o) => (
              <article key={o.order_number}>
                <strong>{o.customer_name}</strong>
                <p>
                  {o.order_number} ·{' '}
                  {menuDate(o.pickup_slot_start, report.menu.timezone, i18n.language)}
                </p>
                <p>{o.items.map((i) => `${i.quantity} × ${i.product_name}`).join(', ')}</p>
                <p>
                  {t(`status_${o.status}`, { defaultValue: o.status })} ·{' '}
                  {t(`payment_${o.payment_status}`, { defaultValue: o.payment_status })}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

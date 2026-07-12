import { useMemo, useState, type FormEvent } from 'react'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import type { Campaign, CampaignInput } from '../types/marketplace'

const EMPTY_FORM: CampaignInput = {
  title: '',
  description: '',
  starts_at: '',
  ends_at: '',
  active: true,
}

function useCampaignsData() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, error } = useMarketplaceData(
    () => marketplaceService.getSellerCampaigns(),
    [refreshKey],
  )
  return { data, loading, error, refresh: () => setRefreshKey((key) => key + 1) }
}

export function SellerCampaignsPage() {
  const { data, loading, error, refresh } = useCampaignsData()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<CampaignInput>(EMPTY_FORM)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [editForm, setEditForm] = useState<CampaignInput>(EMPTY_FORM)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [savingId, setSavingId] = useState<number | null>(null)

  const campaigns = useMemo(() => {
    const items = data ?? []
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return items
    return items.filter((campaign) => {
      return (
        campaign.title.toLowerCase().includes(normalizedQuery) ||
        campaign.description.toLowerCase().includes(normalizedQuery) ||
        (campaign.active ? 'active' : 'inactive').includes(normalizedQuery)
      )
    })
  }, [data, query])

  const stats = useMemo(() => {
    const items = data ?? []
    return {
      total: items.length,
      active: items.filter((campaign) => campaign.active).length,
      inactive: items.filter((campaign) => !campaign.active).length,
    }
  }, [data])

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    try {
      await marketplaceService.createSellerCampaign(form)
      setForm(EMPTY_FORM)
      setCreateOpen(false)
      refresh()
      setFeedback({ kind: 'success', message: 'Campaign created' })
    } catch {
      setFeedback({ kind: 'error', message: 'Could not create campaign' })
    }
  }

  const beginEdit = (campaign: Campaign) => {
    setFeedback(null)
    setCreateOpen(false)
    setEditingCampaign(campaign)
    setEditForm({
      title: campaign.title,
      description: campaign.description,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      active: campaign.active,
    })
  }

  const cancelEdit = () => {
    setEditingCampaign(null)
    setEditForm(EMPTY_FORM)
  }

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingCampaign) return
    setSavingId(editingCampaign.id)
    setFeedback(null)
    try {
      await marketplaceService.updateSellerCampaign(editingCampaign.id, editForm)
      refresh()
      cancelEdit()
      setFeedback({ kind: 'success', message: 'Campaign updated' })
    } catch {
      setFeedback({ kind: 'error', message: 'Could not update campaign' })
    } finally {
      setSavingId(null)
    }
  }

  const remove = async (campaign: Campaign) => {
    if (!window.confirm(`Delete campaign ${campaign.title}?`)) return
    setSavingId(campaign.id)
    setFeedback(null)
    try {
      await marketplaceService.deleteSellerCampaign(campaign.id)
      if (editingCampaign?.id === campaign.id) cancelEdit()
      refresh()
      setFeedback({ kind: 'success', message: 'Campaign deleted' })
    } catch {
      setFeedback({ kind: 'error', message: 'Could not delete campaign' })
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <LoadingState label="Loading campaigns" />

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">Promotions</p>
          <h2>Campaigns</h2>
          <p className="muted">Plan seasonal promotions and keep the active list in one view.</p>
        </div>
        <div className="seller-page-status" aria-label="Campaign counts">
          <span className="status-pill">{stats.total} total</span>
          <span className="status-pill status-pill--success">{stats.active} active</span>
          <span className="status-pill status-pill--muted">{stats.inactive} inactive</span>
        </div>
      </div>

      {error && <div className="alert alert--error">Campaigns could not be loaded.</div>}
      {feedback && (
        <div className={feedback.kind === 'success' ? 'alert alert--success' : 'alert alert--error'}>
          {feedback.message}
        </div>
      )}

      <div className="seller-toolbar seller-toolbar--compact">
        <div className="form-group form-group--full">
          <label htmlFor="seller-campaign-search">Search campaigns</label>
          <input
            id="seller-campaign-search"
            className="form-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, description, status"
          />
        </div>
        <button
          type="button"
          className="button"
          onClick={() => {
            setFeedback(null)
            setEditingCampaign(null)
            setCreateOpen((current) => !current)
          }}
        >
          {createOpen ? 'Close add form' : 'Add campaign'}
        </button>
      </div>

      {createOpen && (
        <div className="seller-section-card">
          <div className="seller-section-card__header">
            <div>
              <p className="eyebrow">Add campaign</p>
              <h3>New campaign</h3>
            </div>
          </div>
          <form className="seller-form seller-category-form" onSubmit={(event) => void submitCreate(event)}>
            <label>
              Title
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <label>
              Starts
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
                required
              />
            </label>
            <label>
              Ends
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(event) => setForm({ ...form, ends_at: event.target.value })}
                required
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
                Create campaign
              </button>
            </div>
          </form>
        </div>
      )}

      {editingCampaign && (
        <div className="seller-section-card">
          <div className="seller-section-card__header">
            <div>
              <p className="eyebrow">Edit campaign</p>
              <h3>{editingCampaign.title}</h3>
            </div>
          </div>
          <form className="seller-form seller-category-form" onSubmit={(event) => void submitEdit(event)}>
            <label>
              Title
              <input
                value={editForm.title}
                onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                required
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
              />
            </label>
            <label>
              Starts
              <input
                type="datetime-local"
                value={editForm.starts_at}
                onChange={(event) => setEditForm({ ...editForm, starts_at: event.target.value })}
                required
              />
            </label>
            <label>
              Ends
              <input
                type="datetime-local"
                value={editForm.ends_at}
                onChange={(event) => setEditForm({ ...editForm, ends_at: event.target.value })}
                required
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
              <button className="button" type="submit" disabled={savingId === editingCampaign.id}>
                {savingId === editingCampaign.id ? 'Saving…' : 'Save campaign'}
              </button>
              <button
                className="button button--ghost"
                type="button"
                disabled={savingId === editingCampaign.id}
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
            <p className="eyebrow">Campaign list</p>
            <h3>All campaigns</h3>
          </div>
          <p className="muted">Use edit to change schedule, description, or status.</p>
        </div>

        {campaigns.length === 0 ? (
          <div className="seller-empty-state">
            <h4>No campaigns found</h4>
            <p>Adjust the search or create a new campaign.</p>
          </div>
        ) : (
          <div className="seller-table-wrap">
            <table className="seller-table seller-table--actions">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <strong>{campaign.title}</strong>
                    </td>
                    <td>{campaign.starts_at}</td>
                    <td>{campaign.ends_at}</td>
                    <td>
                      <span
                        className={
                          campaign.active
                            ? 'status-pill status-pill--success'
                            : 'status-pill status-pill--muted'
                        }
                      >
                        {campaign.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="seller-row-actions">
                      <button
                        className="button button--ghost button--small"
                        type="button"
                        disabled={savingId === campaign.id}
                        onClick={() => beginEdit(campaign)}
                      >
                        Edit
                      </button>
                      <button
                        className="button button--danger button--small"
                        type="button"
                        disabled={savingId === campaign.id}
                        onClick={() => void remove(campaign)}
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

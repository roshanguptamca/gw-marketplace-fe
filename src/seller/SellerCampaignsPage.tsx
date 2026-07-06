import { useState, type FormEvent } from 'react'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import type { CampaignInput } from '../types/marketplace'

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
  const [form, setForm] = useState<CampaignInput>(EMPTY_FORM)
  const [status, setStatus] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('Saving…')
    try {
      await marketplaceService.createSellerCampaign(form)
      setForm(EMPTY_FORM)
      setStatus('')
      refresh()
    } catch {
      setStatus('Could not create campaign')
    }
  }

  const remove = async (id: number) => {
    if (!window.confirm('Delete this campaign?')) return
    try {
      await marketplaceService.deleteSellerCampaign(id)
      refresh()
    } catch {
      setStatus('Could not delete campaign')
    }
  }

  if (loading) return <LoadingState label="Loading campaigns" />

  return (
    <section>
      <p className="eyebrow">Promotions</p>
      <h2>Campaigns</h2>
      <div className="seller-form-grid">
        <form className="seller-form" onSubmit={(event) => void submit(event)}>
          <h3>New campaign</h3>
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
          <button className="button" type="submit">
            Create
          </button>
          <span role="status">{status}</span>
        </form>
        <div className="seller-content">
          <h3>Existing campaigns</h3>
          {error && <p className="inline-error">Campaigns could not be loaded.</p>}
          {(data ?? []).length === 0 && <p>No campaigns yet.</p>}
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.title}</td>
                    <td>{campaign.starts_at}</td>
                    <td>{campaign.ends_at}</td>
                    <td>{campaign.active ? 'Yes' : 'No'}</td>
                    <td>
                      <button
                        className="button button--danger"
                        type="button"
                        onClick={() => void remove(campaign.id)}
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

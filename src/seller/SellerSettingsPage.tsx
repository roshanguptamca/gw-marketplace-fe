import { useEffect, useState, type FormEvent } from 'react'
import { LoadingState } from '../components/LoadingState'
import { useMarketplaceData } from '../hooks/useMarketplaceData'
import { marketplaceService } from '../services/marketplaceService'
import { getApiErrorMessage } from '../services/apiClient'

export function SellerSettingsPage() {
  const { data, loading, error } = useMarketplaceData(() => marketplaceService.getSellerShop(), [])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (data) {
      setName(data.name)
      setDescription(data.description)
    }
  }, [data])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('Saving…')
    try {
      await marketplaceService.updateSellerShop({ name, description })
      setStatus('Saved')
    } catch (error) {
      setStatus(getApiErrorMessage(error, 'Could not save changes'))
    }
  }

  if (loading) return <LoadingState label="Loading shop settings" />
  if (error)
    return (
      <p className="inline-error">
        {getApiErrorMessage(error, 'Shop settings could not be loaded.')}
      </p>
    )
  return (
    <section>
      <p className="eyebrow">Storefront</p>
      <h2>Shop settings</h2>
      <form className="seller-form" onSubmit={(event) => void submit(event)}>
        <p className="form-hint">* Required field</p>
        <label>
          Shop name <span aria-hidden="true">*</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Description
          <textarea
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <button className="button" type="submit">
          Save changes
        </button>
        <span role="status">{status}</span>
      </form>
    </section>
  )
}

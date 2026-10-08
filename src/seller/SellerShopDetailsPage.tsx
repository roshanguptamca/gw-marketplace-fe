import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { Shop } from '../types/marketplace'

interface ShopDetailsForm {
  name: string
  slug: string
  description: string
  descriptionNl: string
  shortDescription: string
  shortDescriptionNl: string
  shopType: string
  shopTypeNl: string
  phone: string
  email: string
  websiteUrl: string
  socialLinksText: string
  address: string
  city: string
  postalCode: string
  country: string
  active: boolean
  approved: boolean
}

function mapShopToForm(shop: Shop): ShopDetailsForm {
  return {
    name: shop.name,
    slug: shop.slug,
    description: shop.description,
    descriptionNl: shop.translations?.description?.nl ?? '',
    shortDescription: shop.shortDescription || '',
    shortDescriptionNl: shop.translations?.short_description?.nl ?? '',
    shopType: shop.shopType || '',
    shopTypeNl: shop.translations?.shop_type?.nl ?? '',
    phone: shop.phone || '',
    email: shop.email || shop.contactEmail || '',
    websiteUrl: shop.websiteUrl || '',
    socialLinksText: (shop.socialLinks || []).join('\n'),
    address: shop.address || '',
    city: shop.location || '',
    postalCode: shop.postalCode || '',
    country: shop.country || '',
    active: shop.active !== false,
    approved: shop.approved === true,
  }
}

export function SellerShopDetailsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [shop, setShop] = useState<Shop | null>(null)
  const [formData, setFormData] = useState<ShopDetailsForm | null>(null)

  useEffect(() => {
    const loadShopDetails = async () => {
      try {
        setLoading(true)
        const data = await marketplaceService.getSellerShop()
        setShop(data)
        setFormData(mapShopToForm(data))
      } catch {
        setError(t('sellerLoadShopDetailsFailed'))
      } finally {
        setLoading(false)
      }
    }

    void loadShopDetails()
  }, [t])

  const socialLinks = useMemo(
    () =>
      (formData?.socialLinksText || '')
        .split('\n')
        .map((link) => link.trim())
        .filter(Boolean),
    [formData?.socialLinksText],
  )

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

    setFormData((prev) => (prev ? { ...prev, [name]: finalValue } : prev))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await marketplaceService.updateSellerShop({
        name: formData.name,
        description: formData.description,
        short_description: formData.shortDescription,
        shop_type: formData.shopType,
        translations: {
          description: { en: formData.description, nl: formData.descriptionNl },
          short_description: {
            en: formData.shortDescription,
            nl: formData.shortDescriptionNl,
          },
          shop_type: { en: formData.shopType, nl: formData.shopTypeNl },
        },
        phone: formData.phone,
        email: formData.email,
        website_url: formData.websiteUrl,
        social_links: socialLinks,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        country: formData.country,
        is_active: formData.active,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError(t('sellerSaveShopDetailsFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label={t('sellerShopDetails')} />

  if (!formData || !shop) {
    return <div className="alert alert--error">{error || t('sellerShopDetailsUnavailable')}</div>
  }

  return (
    <section>
      <div className="seller-page-header">
        <div>
          <p className="eyebrow">{t('sellerShopConfiguration')}</p>
          <h2>{t('sellerShopDetails')}</h2>
          <p className="muted">{t('sellerManageShopProfile')}</p>
        </div>
        <div className="seller-page-status">
          <span className={shop.active ? 'status-pill status-pill--success' : 'status-pill'}>
            {shop.active ? t('sellerActive') : t('sellerPaused')}
          </span>
          <span className="status-pill status-pill--muted">
            {shop.approved ? t('sellerApprovedByAdmin') : t('sellerAwaitingApproval')}
          </span>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{t('sellerShopDetailsSaved')}</div>}

      <form onSubmit={handleSubmit} className="seller-form seller-form--stacked">
        <div className="form-section">
          <h3>{t('sellerBasicInformation')}</h3>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">{t('sellerShopName')} *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="slug">{t('sellerShopSlug')}</label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                disabled
                className="form-input form-input--disabled"
              />
              <p className="form-hint">{t('sellerSlugAdminOnly')}</p>
            </div>

            <div className="form-group">
              <label htmlFor="shopType">{t('sellerShopCategoryType')}</label>
              <input
                type="text"
                id="shopType"
                name="shopType"
                value={formData.shopType}
                onChange={handleChange}
                placeholder={t('sellerShopTypePlaceholder')}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="shopTypeNl">{t('sellerShopCategoryTypeDutch')}</label>
              <input
                type="text"
                id="shopTypeNl"
                name="shopTypeNl"
                value={formData.shopTypeNl}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="shortDescription">{t('sellerShortDescription')}</label>
              <input
                type="text"
                id="shortDescription"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                placeholder={t('sellerShortDescriptionPlaceholder')}
                maxLength={240}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="shortDescriptionNl">{t('sellerShortDescriptionDutch')}</label>
              <input
                type="text"
                id="shortDescriptionNl"
                name="shortDescriptionNl"
                value={formData.shortDescriptionNl}
                onChange={handleChange}
                maxLength={240}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">{t('sellerFullDescriptionEnglish')}</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="descriptionNl">{t('sellerFullDescriptionDutch')}</label>
            <textarea
              id="descriptionNl"
              name="descriptionNl"
              value={formData.descriptionNl}
              onChange={handleChange}
              rows={5}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>{t('sellerContactLocation')}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="phone">{t('sellerPhone')}</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">{t('sellerEmail')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="websiteUrl">{t('sellerWebsiteSocialUrl')}</label>
              <input
                type="url"
                id="websiteUrl"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="city">{t('sellerCity')}</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="postalCode">{t('sellerPostalCode')}</label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="country">{t('sellerCountry')}</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">{t('sellerAddress')}</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="socialLinksText">{t('sellerSocialLinks')}</label>
            <textarea
              id="socialLinksText"
              name="socialLinksText"
              value={formData.socialLinksText}
              onChange={handleChange}
              rows={3}
              className="form-input"
              placeholder={t('sellerOneUrlPerLine')}
            />
            <p className="form-hint">{t('sellerSocialLinksHint')}</p>
          </div>
        </div>

        <div className="form-section">
          <h3>{t('sellerPublicStatus')}</h3>
          <label className="seller-toggle">
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleChange}
            />
            <span>{t('sellerShopActiveVisible')}</span>
          </label>
          <p className="form-hint">
            {t('sellerAdminApprovalSeparate')}
          </p>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving} className="button button--primary">
            {saving ? t('sellerSavingChanges') : t('sellerSaveChanges')}
          </button>
        </div>
      </form>
    </section>
  )
}

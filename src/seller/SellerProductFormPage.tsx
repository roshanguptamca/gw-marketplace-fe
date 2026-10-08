import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import {
  MEASURE_UNITS,
  SELLING_UNITS,
  type MeasureUnit,
  type SellerCategory,
  type SellerProduct,
  type SellerProductImage,
  type SellingUnit,
} from '../types/marketplace'
import { handleProductImageError } from '../utils/productImages'
import { measureUnitLabel, sellingUnitLabel } from '../utils/productUnits'

type LeadTimeUnit = 'hours' | 'days'

interface ProductFormState {
  name: string
  price: string
  vat_rate: string
  compare_at_price: string
  stock_quantity: string
  sku: string
  category: string
  description: string
  descriptionNl: string
  ingredients: string
  ingredientsNl: string
  allergens: string
  allergensNl: string
  is_active: boolean
  is_featured: boolean
  selling_unit: SellingUnit
  units_per_pack: string
  weight_value: string
  weight_unit: MeasureUnit | ''
  minimum_order_quantity: string
  minimum_physical_units: string
  minimum_order_amount: string
  lead_time_value: string
  lead_time_unit: LeadTimeUnit
}

/** Show whole days when the stored lead time divides evenly, otherwise hours. */
function leadTimeFields(minutes: number | null | undefined) {
  const total = minutes ?? 0
  if (total > 0 && total % (24 * 60) === 0) {
    return { lead_time_value: String(total / (24 * 60)), lead_time_unit: 'days' as const }
  }
  return { lead_time_value: total > 0 ? String(total / 60) : '', lead_time_unit: 'hours' as const }
}

function leadTimeMinutes(value: string, unit: LeadTimeUnit): number {
  const parsed = Number(value)
  if (!value || !Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.round(parsed * (unit === 'days' ? 24 * 60 : 60))
}

function trimDecimal(value: string | null | undefined): string {
  return value ? String(Number(value)) : ''
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  price: '',
  vat_rate: '',
  compare_at_price: '',
  stock_quantity: '0',
  sku: '',
  category: '',
  description: '',
  descriptionNl: '',
  ingredients: '',
  ingredientsNl: '',
  allergens: '',
  allergensNl: '',
  is_active: true,
  is_featured: false,
  selling_unit: 'PIECE',
  units_per_pack: '',
  weight_value: '',
  weight_unit: '',
  minimum_order_quantity: '',
  minimum_physical_units: '',
  minimum_order_amount: '',
  lead_time_value: '',
  lead_time_unit: 'hours',
}

export function SellerProductFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const productId = id ? Number(id) : null
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [categories, setCategories] = useState<SellerCategory[]>([])
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [images, setImages] = useState<SellerProductImage[]>([])
  const [galleryFile, setGalleryFile] = useState<File | null>(null)
  const [gallerySortOrder, setGallerySortOrder] = useState('')
  const [galleryAltText, setGalleryAltText] = useState('')
  const [galleryStatus, setGalleryStatus] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    Promise.all([
      marketplaceService.getSellerCategories(),
      productId ? marketplaceService.getSellerProduct(productId) : Promise.resolve(null),
    ])
      .then(([categoryList, product]) => {
        if (!active) return
        setCategories(categoryList)
        if (product) {
          setForm({
            name: product.name,
            price: product.price,
            vat_rate: product.vat_rate ?? '',
            compare_at_price: product.compare_at_price ?? '',
            stock_quantity: String(product.stock_quantity ?? 0),
            sku: product.sku,
            category: product.category != null ? String(product.category) : '',
            description: product.description,
            descriptionNl: product.translations?.description?.nl ?? '',
            ingredients: product.ingredients,
            ingredientsNl: product.translations?.ingredients?.nl ?? '',
            allergens: product.allergens,
            allergensNl: product.translations?.allergens?.nl ?? '',
            is_active: product.is_active,
            is_featured: product.is_featured,
            selling_unit: product.selling_unit ?? 'PIECE',
            units_per_pack: product.units_per_pack ? String(product.units_per_pack) : '',
            weight_value: trimDecimal(product.weight_value),
            weight_unit: product.weight_unit ?? '',
            minimum_order_quantity: product.minimum_order_quantity
              ? String(product.minimum_order_quantity)
              : '',
            minimum_physical_units: product.minimum_physical_units
              ? String(product.minimum_physical_units)
              : '',
            minimum_order_amount: product.minimum_order_amount ?? '',
            ...leadTimeFields(product.preparation_time_minutes),
          })
          setImages([...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order))
        }
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setLoadError(true)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [productId])

  const updateField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const refreshGallery = async (id: number) => {
    try {
      const product: SellerProduct = await marketplaceService.getSellerProduct(id)
      setImages([...(product.images ?? [])].sort((a, b) => a.sort_order - b.sort_order))
    } catch {
      // Keep previous gallery state if refresh fails.
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus(t('sellerSavingChanges'))
    const formData = new FormData()
    formData.set('name', form.name)
    formData.set('price', form.price)
    formData.set('vat_rate', form.vat_rate)
    if (form.compare_at_price) formData.set('compare_at_price', form.compare_at_price)
    formData.set('stock_quantity', form.stock_quantity || '0')
    if (form.sku) formData.set('sku', form.sku)
    if (form.category) formData.set('category', form.category)
    formData.set('description', form.description)
    formData.set('ingredients', form.ingredients)
    formData.set('allergens', form.allergens)
    formData.set(
      'translations',
      JSON.stringify({
        description: { en: form.description, nl: form.descriptionNl },
        ingredients: { en: form.ingredients, nl: form.ingredientsNl },
        allergens: { en: form.allergens, nl: form.allergensNl },
      }),
    )
    formData.set('is_active', form.is_active ? 'true' : 'false')
    formData.set('is_featured', form.is_featured ? 'true' : 'false')
    const isWeight = form.selling_unit === 'WEIGHT'
    formData.set('selling_unit', form.selling_unit)
    // Empty strings are stored as "not configured" (null) by the API.
    formData.set('units_per_pack', isWeight ? '' : form.units_per_pack)
    formData.set('weight_value', isWeight ? form.weight_value : '')
    formData.set('weight_unit', isWeight ? form.weight_unit : '')
    formData.set('minimum_order_quantity', form.minimum_order_quantity)
    formData.set('minimum_physical_units', isWeight ? '' : form.minimum_physical_units)
    formData.set('minimum_order_amount', form.minimum_order_amount)
    formData.set(
      'preparation_time_minutes',
      String(leadTimeMinutes(form.lead_time_value, form.lead_time_unit)),
    )
    if (imageFile) formData.set('image', imageFile)

    try {
      if (productId) {
        await marketplaceService.updateSellerProductForm(productId, formData)
        setStatus(t('sellerProductSaved'))
        void refreshGallery(productId)
      } else {
        const created = await marketplaceService.createSellerProductForm(formData)
        navigate(`/seller/products/${created.id}/edit`)
      }
    } catch {
      setStatus(t('sellerSaveProductFailed'))
    }
  }

  const removeProduct = async () => {
    if (!productId) return
    if (!window.confirm(t('sellerDeleteProductConfirm'))) return
    try {
      await marketplaceService.deleteSellerProduct(productId)
      navigate('/seller/products')
    } catch {
      setStatus(t('sellerDeleteProductFailedForm'))
    }
  }

  const uploadGalleryImage = async () => {
    if (!productId) return
    if (!galleryFile) {
      setGalleryStatus(t('sellerChooseFileFirst'))
      return
    }
    const formData = new FormData()
    formData.set('image', galleryFile)
    if (gallerySortOrder !== '') formData.set('sort_order', gallerySortOrder)
    if (galleryAltText.trim()) formData.set('alt_text', galleryAltText.trim())
    setGalleryStatus(t('sellerUploading'))
    try {
      await marketplaceService.addSellerProductImage(productId, formData)
      setGalleryFile(null)
      setGallerySortOrder('')
      setGalleryAltText('')
      setGalleryStatus('')
      void refreshGallery(productId)
    } catch {
      setGalleryStatus(t('sellerUploadImageFailed'))
    }
  }

  const deleteGalleryImage = async (imageId: number) => {
    if (!productId) return
    try {
      await marketplaceService.deleteSellerProductImage(imageId)
      void refreshGallery(productId)
    } catch {
      setGalleryStatus(t('sellerRemoveImageFailed'))
    }
  }

  if (loading) return <LoadingState label={t('loadingProduct')} />
  if (loadError) return <p className="inline-error">{t('sellerLoadProductFailed')}</p>

  return (
    <section>
      <p className="eyebrow">{t('sellerInventory')}</p>
      <h2>{productId ? t('sellerEditProductTitle') : t('sellerAddProduct')}</h2>
      <form className="seller-form" onSubmit={(event) => void submit(event)}>
        <div className="seller-form-grid">
          <label>
            {t('sellerName')}
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
          </label>
          <label>
            {t('sellerPrice')}
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              required
            />
          </label>
          <label>
            {t('sellerCompareAtPrice')}
            <input
              type="number"
              step="0.01"
              value={form.compare_at_price}
              onChange={(event) => updateField('compare_at_price', event.target.value)}
            />
          </label>
          <label>
            {t('sellerVatDefaultHint')}
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.vat_rate}
              onChange={(event) => updateField('vat_rate', event.target.value)}
            />
          </label>
          <label>
            {t('sellerStock')}
            <input
              type="number"
              step="1"
              value={form.stock_quantity}
              onChange={(event) => updateField('stock_quantity', event.target.value)}
            />
          </label>
          <label>
            SKU
            <input value={form.sku} onChange={(event) => updateField('sku', event.target.value)} />
          </label>
          <label>
            {t('sellerCategories')}
            <select
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
            >
              <option value="">{t('sellerNone')}</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('sellerMainImage')}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setImageFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
        </div>
        <fieldset className="seller-form-section">
          <legend>{t('sellerSellingFormat')}</legend>
          <p className="inline-note">{t('sellerSellingFormatHint')}</p>
          <div className="seller-form-grid">
            <label>
              {t('sellerSoldAs')}
              <select
                value={form.selling_unit}
                onChange={(event) => updateField('selling_unit', event.target.value as SellingUnit)}
              >
                {SELLING_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {sellingUnitLabel(unit)}
                  </option>
                ))}
              </select>
            </label>
            {form.selling_unit === 'WEIGHT' ? (
              <>
                <label>
                  {t('sellerWeightVolume')}
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={form.weight_value}
                    onChange={(event) => updateField('weight_value', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Unit
                  <select
                    value={form.weight_unit}
                    onChange={(event) =>
                      updateField('weight_unit', event.target.value as MeasureUnit | '')
                    }
                    required
                  >
                    <option value="">{t('sellerChooseUnit')}</option>
                    {MEASURE_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {measureUnitLabel(unit)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              form.selling_unit !== 'PIECE' && (
                <label>
                  {t('sellerPiecesPer', {
                    unit: sellingUnitLabel(form.selling_unit).toLowerCase(),
                  })}
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={form.units_per_pack}
                    onChange={(event) => updateField('units_per_pack', event.target.value)}
                    required={form.selling_unit === 'PACK'}
                  />
                </label>
              )
            )}
          </div>
        </fieldset>
        <fieldset className="seller-form-section">
          <legend>{t('sellerOrderingRequirements')}</legend>
          <p className="inline-note">{t('sellerOrderRequirementsHint')}</p>
          <div className="seller-form-grid">
            <label>
              {t('sellerMinimumCartQuantity')}
              <input
                type="number"
                step="1"
                min="1"
                value={form.minimum_order_quantity}
                onChange={(event) => updateField('minimum_order_quantity', event.target.value)}
              />
            </label>
            {form.selling_unit !== 'WEIGHT' && (
              <label>
                {t('sellerMinimumPhysicalPieces')}
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={form.minimum_physical_units}
                  onChange={(event) => updateField('minimum_physical_units', event.target.value)}
                />
              </label>
            )}
            <label>
              {t('sellerMinimumProductAmount')}
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.minimum_order_amount}
                onChange={(event) => updateField('minimum_order_amount', event.target.value)}
              />
            </label>
            <label>
              {t('sellerAdvanceNotice')}
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.lead_time_value}
                onChange={(event) => updateField('lead_time_value', event.target.value)}
              />
            </label>
            <label>
              {t('sellerAdvanceNoticeUnit')}
              <select
                value={form.lead_time_unit}
                onChange={(event) =>
                  updateField('lead_time_unit', event.target.value as LeadTimeUnit)
                }
              >
                <option value="hours">{t('sellerAdvanceNoticeHours')}</option>
                <option value="days">{t('sellerAdvanceNoticeDays')}</option>
              </select>
            </label>
          </div>
          <p className="inline-note">{t('sellerAdvanceNoticeHint')}</p>
        </fieldset>
        <label>
          {t('sellerProductDescriptionEnglish')}
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
          />
        </label>
        <label>
          {t('sellerProductDescriptionDutch')}
          <textarea
            rows={4}
            value={form.descriptionNl}
            onChange={(event) => updateField('descriptionNl', event.target.value)}
          />
        </label>
        <label>
          {t('sellerProductIngredientsEnglish')}
          <textarea
            rows={3}
            value={form.ingredients}
            onChange={(event) => updateField('ingredients', event.target.value)}
          />
        </label>
        <label>
          {t('sellerProductIngredientsDutch')}
          <textarea
            rows={3}
            value={form.ingredientsNl}
            onChange={(event) => updateField('ingredientsNl', event.target.value)}
          />
        </label>
        <label>
          {t('sellerProductAllergensEnglish')}
          <textarea
            rows={3}
            value={form.allergens}
            onChange={(event) => updateField('allergens', event.target.value)}
          />
        </label>
        <label>
          {t('sellerProductAllergensDutch')}
          <textarea
            rows={3}
            value={form.allergensNl}
            onChange={(event) => updateField('allergensNl', event.target.value)}
          />
        </label>
        <label className="seller-checkbox-row">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateField('is_active', event.target.checked)}
          />
          {t('sellerActive')}
        </label>
        <label className="seller-checkbox-row">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(event) => updateField('is_featured', event.target.checked)}
          />
          {t('sellerProductFeatured')}
        </label>
        <div className="seller-actions">
          <button className="button" type="submit">
            {t('sellerSaveProduct')}
          </button>
          {productId && (
            <button
              className="button button--danger"
              type="button"
              onClick={() => void removeProduct()}
            >
              {t('sellerDeleteButton')}
            </button>
          )}
        </div>
        <span role="status">{status}</span>
      </form>

      {productId && (
        <div className="seller-content" style={{ marginTop: '24px' }}>
          <h3>{t('sellerGalleryImages')}</h3>
          <div className="seller-gallery">
            {images.length === 0 && <p className="inline-error">{t('sellerNoGalleryImages')}</p>}
            {images.map((image) => (
              <div className="seller-gallery__item" key={image.id}>
                <img src={image.image_url} alt={image.alt_text} onError={handleProductImageError} />
                <span>{image.sort_order}</span>
                <button
                  className="button button--danger"
                  type="button"
                  onClick={() => void deleteGalleryImage(image.id)}
                >
                  {t('sellerRemove')}
                </button>
              </div>
            ))}
          </div>
          <div className="seller-actions">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setGalleryFile(event.target.files?.[0] ?? null)
              }
            />
            <input
              type="number"
              min={0}
              placeholder={t('sellerSortOrder')}
              value={gallerySortOrder}
              onChange={(event) => setGallerySortOrder(event.target.value)}
            />
            <input
              type="text"
              maxLength={150}
              placeholder={t('sellerAltText')}
              value={galleryAltText}
              onChange={(event) => setGalleryAltText(event.target.value)}
            />
            <button
              className="button button--ghost"
              type="button"
              onClick={() => void uploadGalleryImage()}
            >
              Add image
            </button>
          </div>
          <span role="status">{galleryStatus}</span>
        </div>
      )}
    </section>
  )
}

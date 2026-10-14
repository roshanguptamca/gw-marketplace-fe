import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import { getApiErrorMessage, getApiFormErrors } from '../services/apiClient'
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
import { MEASURE_UNIT_LABELS, SELLING_UNIT_LABELS } from '../utils/productUnits'

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
  const apiErrorFallbacks = {
    network: t('networkRequestError'),
    server: t('serverRequestError'),
  }
  const { id } = useParams()
  const productId = id ? Number(id) : null
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [categories, setCategories] = useState<SellerCategory[]>([])
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [status, setStatus] = useState('')
  const [statusIsError, setStatusIsError] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [images, setImages] = useState<SellerProductImage[]>([])
  const [galleryFile, setGalleryFile] = useState<File | null>(null)
  const [gallerySortOrder, setGallerySortOrder] = useState('')
  const [galleryAltText, setGalleryAltText] = useState('')
  const [galleryStatus, setGalleryStatus] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    Promise.all([
      marketplaceService.getSellerCategories(),
      productId ? marketplaceService.getSellerProduct(productId) : Promise.resolve(null),
    ])
      .then(([categoryList, product]) => {
        if (!active) return
        setCategories(categoryList.filter((category) => category.shop !== null))
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
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            getApiErrorMessage(error, t('sellerLoadProductFailed'), {
              network: t('networkRequestError'),
              server: t('serverRequestError'),
            }),
          )
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [productId, t])

  const updateField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setStatus('')
    setStatusIsError(false)
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
    setSaving(true)
    setErrors({})
    setStatusIsError(false)
    setStatus(t('sellerSavingChanges'))
    const formData = new FormData()
    formData.set('name', form.name)
    formData.set('price', form.price)
    if (form.vat_rate) formData.set('vat_rate', form.vat_rate)
    if (form.compare_at_price) formData.set('compare_at_price', form.compare_at_price)
    formData.set('stock_quantity', form.stock_quantity || '0')
    if (form.sku) formData.set('sku', form.sku)
    formData.set('category', form.category)
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
    } catch (error) {
      const result = getApiFormErrors(
        error,
        t('sellerSaveProductFailed'),
        {
          name: 'name',
          price: 'price',
          vat_rate: 'vat_rate',
          compare_at_price: 'compare_at_price',
          stock_quantity: 'stock_quantity',
          sku: 'sku',
          category: 'category',
          image: 'image',
          description: 'description',
          ingredients: 'ingredients',
          allergens: 'allergens',
          selling_unit: 'selling_unit',
          weight_value: 'weight_value',
          weight_unit: 'weight_unit',
          units_per_pack: 'units_per_pack',
          minimum_order_quantity: 'minimum_order_quantity',
          minimum_physical_units: 'minimum_physical_units',
          minimum_order_amount: 'minimum_order_amount',
          preparation_time_minutes: 'lead_time_value',
        },
        apiErrorFallbacks,
      )
      setErrors(result.fields)
      setStatusIsError(true)
      setStatus(result.message)
    } finally {
      setSaving(false)
    }
  }

  const removeProduct = async () => {
    if (!productId) return
    if (!window.confirm(t('sellerDeleteProductConfirm'))) return
    try {
      await marketplaceService.deleteSellerProduct(productId)
      navigate('/seller/products')
    } catch (error) {
      setStatusIsError(true)
      setStatus(getApiErrorMessage(error, t('sellerDeleteProductFailedForm'), apiErrorFallbacks))
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
    } catch (error) {
      setGalleryStatus(getApiErrorMessage(error, t('sellerUploadImageFailed'), apiErrorFallbacks))
    }
  }

  const deleteGalleryImage = async (imageId: number) => {
    if (!productId) return
    try {
      await marketplaceService.deleteSellerProductImage(imageId)
      void refreshGallery(productId)
    } catch (error) {
      setGalleryStatus(getApiErrorMessage(error, t('sellerRemoveImageFailed'), apiErrorFallbacks))
    }
  }

  if (loading) return <LoadingState label={t('loadingProduct')} />
  if (loadError) return <p className="inline-error">{loadError}</p>

  return (
    <section>
      <p className="eyebrow">{t('sellerInventory')}</p>
      <h2>{productId ? t('sellerEditProductTitle') : t('sellerAddProduct')}</h2>
      <form className="seller-form" onSubmit={(event) => void submit(event)}>
        <p className="form-hint">{t('requiredFieldNote')}</p>
        <div className="seller-category-picker">
          <label htmlFor="product-category">{t('sellerProductCategory')}</label>
          <select
            id="product-category"
            value={form.category}
            onChange={(event) => updateField('category', event.target.value)}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? 'product-category-error' : undefined}
          >
            <option value="">{t('sellerNone')}</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category && (
            <span id="product-category-error" className="form-field__error" role="alert">
              {errors.category}
            </span>
          )}
          {categories.length === 0 && (
            <p className="form-hint">
              {t('sellerNoProductCategories')}{' '}
              <Link to="/seller/categories">{t('sellerCreateProductCategory')}</Link>
            </p>
          )}
        </div>
        <div className="seller-form-grid">
          <label>
            {t('sellerName')} <span aria-hidden="true">*</span>
            <input
              id="product-name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'product-name-error' : undefined}
            />
            {errors.name && (
              <span id="product-name-error" className="form-field__error" role="alert">
                {errors.name}
              </span>
            )}
          </label>
          <label>
            {t('sellerPrice')} <span aria-hidden="true">*</span>
            <input
              id="product-price"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              required
              aria-invalid={Boolean(errors.price)}
              aria-describedby={errors.price ? 'product-price-error' : undefined}
            />
            {errors.price && (
              <span id="product-price-error" className="form-field__error" role="alert">
                {errors.price}
              </span>
            )}
          </label>
          <label>
            {t('sellerCompareAtPrice')}
            <input
              id="product-compare-at-price"
              type="number"
              step="0.01"
              value={form.compare_at_price}
              onChange={(event) => updateField('compare_at_price', event.target.value)}
              aria-invalid={Boolean(errors.compare_at_price)}
              aria-describedby={
                errors.compare_at_price ? 'product-compare-at-price-error' : undefined
              }
            />
            {errors.compare_at_price && (
              <span id="product-compare-at-price-error" className="form-field__error" role="alert">
                {errors.compare_at_price}
              </span>
            )}
          </label>
          <label>
            {t('sellerVatDefaultHint')}
            <input
              id="product-vat-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.vat_rate}
              onChange={(event) => updateField('vat_rate', event.target.value)}
              aria-invalid={Boolean(errors.vat_rate)}
              aria-describedby={errors.vat_rate ? 'product-vat-rate-error' : undefined}
            />
            {errors.vat_rate && (
              <span id="product-vat-rate-error" className="form-field__error" role="alert">
                {errors.vat_rate}
              </span>
            )}
          </label>
          <label>
            {t('sellerStock')}
            <input
              id="product-stock-quantity"
              type="number"
              step="1"
              value={form.stock_quantity}
              onChange={(event) => updateField('stock_quantity', event.target.value)}
              aria-invalid={Boolean(errors.stock_quantity)}
              aria-describedby={errors.stock_quantity ? 'product-stock-quantity-error' : undefined}
            />
            {errors.stock_quantity && (
              <span id="product-stock-quantity-error" className="form-field__error" role="alert">
                {errors.stock_quantity}
              </span>
            )}
          </label>
          <label>
            SKU <span className="form-hint">{t('sellerSkuImageRequirement')}</span>
            {imageFile && (
              <>
                {' '}
                <span aria-hidden="true">*</span>
              </>
            )}
            <input
              id="product-sku"
              value={form.sku}
              onChange={(event) => updateField('sku', event.target.value)}
              required={Boolean(imageFile)}
              aria-invalid={Boolean(errors.sku)}
              aria-describedby={errors.sku ? 'product-sku-error' : undefined}
            />
            {errors.sku && (
              <span id="product-sku-error" className="form-field__error" role="alert">
                {errors.sku}
              </span>
            )}
          </label>
          <label>
            {t('sellerMainImage')}
            <input
              id="product-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setImageFile(event.target.files?.[0] ?? null)
              }
              aria-invalid={Boolean(errors.image)}
              aria-describedby={errors.image ? 'product-image-error' : undefined}
            />
            {errors.image && (
              <span id="product-image-error" className="form-field__error" role="alert">
                {errors.image}
              </span>
            )}
          </label>
        </div>
        <fieldset className="seller-form-section">
          <legend>{t('sellerSellingFormat')}</legend>
          <p className="inline-note">{t('sellerSellingFormatHint')}</p>
          <div className="seller-form-grid">
            <label>
              {t('sellerSoldAs')}
              <select
                id="product-selling-unit"
                value={form.selling_unit}
                onChange={(event) => updateField('selling_unit', event.target.value as SellingUnit)}
                aria-invalid={Boolean(errors.selling_unit)}
                aria-describedby={errors.selling_unit ? 'product-selling-unit-error' : undefined}
              >
                {SELLING_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {SELLING_UNIT_LABELS[unit]}
                  </option>
                ))}
              </select>
              {errors.selling_unit && (
                <span id="product-selling-unit-error" className="form-field__error" role="alert">
                  {errors.selling_unit}
                </span>
              )}
            </label>
            {form.selling_unit === 'WEIGHT' ? (
              <>
                <label>
                  {t('sellerWeightVolume')} <span aria-hidden="true">*</span>
                  <input
                    id="product-weight-value"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={form.weight_value}
                    onChange={(event) => updateField('weight_value', event.target.value)}
                    required
                    aria-invalid={Boolean(errors.weight_value)}
                    aria-describedby={
                      errors.weight_value ? 'product-weight-value-error' : undefined
                    }
                  />
                  {errors.weight_value && (
                    <span
                      id="product-weight-value-error"
                      className="form-field__error"
                      role="alert"
                    >
                      {errors.weight_value}
                    </span>
                  )}
                </label>
                <label>
                  Unit <span aria-hidden="true">*</span>
                  <select
                    id="product-weight-unit"
                    value={form.weight_unit}
                    onChange={(event) =>
                      updateField('weight_unit', event.target.value as MeasureUnit | '')
                    }
                    required
                    aria-invalid={Boolean(errors.weight_unit)}
                    aria-describedby={errors.weight_unit ? 'product-weight-unit-error' : undefined}
                  >
                    <option value="">{t('sellerChooseUnit')}</option>
                    {MEASURE_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {MEASURE_UNIT_LABELS[unit]}
                      </option>
                    ))}
                  </select>
                  {errors.weight_unit && (
                    <span id="product-weight-unit-error" className="form-field__error" role="alert">
                      {errors.weight_unit}
                    </span>
                  )}
                </label>
              </>
            ) : (
              form.selling_unit !== 'PIECE' && (
                <label>
                  {t('sellerPiecesPer', {
                    unit: SELLING_UNIT_LABELS[form.selling_unit].toLowerCase(),
                  })}
                  {form.selling_unit === 'PACK' && (
                    <>
                      {' '}
                      <span aria-hidden="true">*</span>
                    </>
                  )}
                  <input
                    id="product-units-per-pack"
                    type="number"
                    step="1"
                    min="1"
                    value={form.units_per_pack}
                    onChange={(event) => updateField('units_per_pack', event.target.value)}
                    required={form.selling_unit === 'PACK'}
                    aria-invalid={Boolean(errors.units_per_pack)}
                    aria-describedby={
                      errors.units_per_pack ? 'product-units-per-pack-error' : undefined
                    }
                  />
                  {errors.units_per_pack && (
                    <span
                      id="product-units-per-pack-error"
                      className="form-field__error"
                      role="alert"
                    >
                      {errors.units_per_pack}
                    </span>
                  )}
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
                id="product-minimum-order-quantity"
                type="number"
                step="1"
                min="1"
                value={form.minimum_order_quantity}
                onChange={(event) => updateField('minimum_order_quantity', event.target.value)}
                aria-invalid={Boolean(errors.minimum_order_quantity)}
                aria-describedby={
                  errors.minimum_order_quantity ? 'product-minimum-order-quantity-error' : undefined
                }
              />
              {errors.minimum_order_quantity && (
                <span
                  id="product-minimum-order-quantity-error"
                  className="form-field__error"
                  role="alert"
                >
                  {errors.minimum_order_quantity}
                </span>
              )}
            </label>
            {form.selling_unit !== 'WEIGHT' && (
              <label>
                {t('sellerMinimumPhysicalPieces')}
                <input
                  id="product-minimum-physical-units"
                  type="number"
                  step="1"
                  min="1"
                  value={form.minimum_physical_units}
                  onChange={(event) => updateField('minimum_physical_units', event.target.value)}
                  aria-invalid={Boolean(errors.minimum_physical_units)}
                  aria-describedby={
                    errors.minimum_physical_units
                      ? 'product-minimum-physical-units-error'
                      : undefined
                  }
                />
                {errors.minimum_physical_units && (
                  <span
                    id="product-minimum-physical-units-error"
                    className="form-field__error"
                    role="alert"
                  >
                    {errors.minimum_physical_units}
                  </span>
                )}
              </label>
            )}
            <label>
              {t('sellerMinimumProductAmount')}
              <input
                id="product-minimum-order-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.minimum_order_amount}
                onChange={(event) => updateField('minimum_order_amount', event.target.value)}
                aria-invalid={Boolean(errors.minimum_order_amount)}
                aria-describedby={
                  errors.minimum_order_amount ? 'product-minimum-order-amount-error' : undefined
                }
              />
              {errors.minimum_order_amount && (
                <span
                  id="product-minimum-order-amount-error"
                  className="form-field__error"
                  role="alert"
                >
                  {errors.minimum_order_amount}
                </span>
              )}
            </label>
            <label>
              {t('sellerAdvanceNotice')}
              <input
                id="product-lead-time-value"
                type="number"
                step="0.5"
                min="0"
                value={form.lead_time_value}
                onChange={(event) => updateField('lead_time_value', event.target.value)}
                aria-invalid={Boolean(errors.lead_time_value)}
                aria-describedby={
                  errors.lead_time_value ? 'product-lead-time-value-error' : undefined
                }
              />
              {errors.lead_time_value && (
                <span id="product-lead-time-value-error" className="form-field__error" role="alert">
                  {errors.lead_time_value}
                </span>
              )}
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
            id="product-description"
            rows={4}
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'product-description-error' : undefined}
          />
          {errors.description && (
            <span id="product-description-error" className="form-field__error" role="alert">
              {errors.description}
            </span>
          )}
        </label>
        <label>
          {t('sellerProductDescriptionDutch')}
          <textarea
            id="product-description-nl"
            rows={4}
            value={form.descriptionNl}
            onChange={(event) => updateField('descriptionNl', event.target.value)}
          />
        </label>
        <label>
          {t('sellerProductIngredientsEnglish')}
          <textarea
            id="product-ingredients"
            rows={3}
            value={form.ingredients}
            onChange={(event) => updateField('ingredients', event.target.value)}
            aria-invalid={Boolean(errors.ingredients)}
            aria-describedby={errors.ingredients ? 'product-ingredients-error' : undefined}
          />
          {errors.ingredients && (
            <span id="product-ingredients-error" className="form-field__error" role="alert">
              {errors.ingredients}
            </span>
          )}
        </label>
        <label>
          {t('sellerProductIngredientsDutch')}
          <textarea
            id="product-ingredients-nl"
            rows={3}
            value={form.ingredientsNl}
            onChange={(event) => updateField('ingredientsNl', event.target.value)}
          />
        </label>
        <label>
          {t('sellerProductAllergensEnglish')}
          <textarea
            id="product-allergens"
            rows={3}
            value={form.allergens}
            onChange={(event) => updateField('allergens', event.target.value)}
            aria-invalid={Boolean(errors.allergens)}
            aria-describedby={errors.allergens ? 'product-allergens-error' : undefined}
          />
          {errors.allergens && (
            <span id="product-allergens-error" className="form-field__error" role="alert">
              {errors.allergens}
            </span>
          )}
        </label>
        <label>
          {t('sellerProductAllergensDutch')}
          <textarea
            id="product-allergens-nl"
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
          {form.is_active ? t('sellerProductActive') : t('sellerProductInactive')}
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
          <button className="button" type="submit" disabled={saving}>
            {saving ? t('sellerSavingChanges') : t('sellerSaveProduct')}
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
        {status && (
          <p
            className={statusIsError ? 'inline-error' : 'inline-note'}
            role={statusIsError ? 'alert' : 'status'}
          >
            {status}
          </p>
        )}
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

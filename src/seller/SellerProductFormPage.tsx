import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { ApiError } from '../services/apiClient'
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
import { MEASURE_UNIT_LABELS, SELLING_UNIT_LABELS } from '../utils/productUnits'

type LeadTimeUnit = 'hours' | 'days'

interface ProductFormState {
  name: string
  price: string
  compare_at_price: string
  stock_quantity: string
  sku: string
  category: string
  description: string
  ingredients: string
  allergens: string
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
  compare_at_price: '',
  stock_quantity: '0',
  sku: '',
  category: '',
  description: '',
  ingredients: '',
  allergens: '',
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
            compare_at_price: product.compare_at_price ?? '',
            stock_quantity: String(product.stock_quantity ?? 0),
            sku: product.sku,
            category: product.category != null ? String(product.category) : '',
            description: product.description,
            ingredients: product.ingredients,
            allergens: product.allergens,
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
    setStatus('Saving…')
    const formData = new FormData()
    formData.set('name', form.name)
    formData.set('price', form.price)
    if (form.compare_at_price) formData.set('compare_at_price', form.compare_at_price)
    formData.set('stock_quantity', form.stock_quantity || '0')
    if (form.sku) formData.set('sku', form.sku)
    if (form.category) formData.set('category', form.category)
    formData.set('description', form.description)
    formData.set('ingredients', form.ingredients)
    formData.set('allergens', form.allergens)
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
        setStatus('Product saved')
        void refreshGallery(productId)
      } else {
        const created = await marketplaceService.createSellerProductForm(formData)
        navigate(`/seller/products/${created.id}/edit`)
      }
    } catch (caught) {
      setStatus(
        caught instanceof ApiError && caught.status === 400
          ? `Could not save product: ${caught.message}`
          : 'Could not save product',
      )
    }
  }

  const removeProduct = async () => {
    if (!productId) return
    if (!window.confirm('Delete this product?')) return
    try {
      await marketplaceService.deleteSellerProduct(productId)
      navigate('/seller/products')
    } catch {
      setStatus('Could not delete product')
    }
  }

  const uploadGalleryImage = async () => {
    if (!productId) return
    if (!galleryFile) {
      setGalleryStatus('Please choose a file first.')
      return
    }
    const formData = new FormData()
    formData.set('image', galleryFile)
    if (gallerySortOrder !== '') formData.set('sort_order', gallerySortOrder)
    if (galleryAltText.trim()) formData.set('alt_text', galleryAltText.trim())
    setGalleryStatus('Uploading…')
    try {
      await marketplaceService.addSellerProductImage(productId, formData)
      setGalleryFile(null)
      setGallerySortOrder('')
      setGalleryAltText('')
      setGalleryStatus('')
      void refreshGallery(productId)
    } catch {
      setGalleryStatus('Could not upload image')
    }
  }

  const deleteGalleryImage = async (imageId: number) => {
    if (!productId) return
    try {
      await marketplaceService.deleteSellerProductImage(imageId)
      void refreshGallery(productId)
    } catch {
      setGalleryStatus('Could not remove image')
    }
  }

  if (loading) return <LoadingState label="Loading product" />
  if (loadError) return <p className="inline-error">Product could not be loaded.</p>

  return (
    <section>
      <p className="eyebrow">Inventory</p>
      <h2>{productId ? 'Edit product' : 'Add product'}</h2>
      <form className="seller-form" onSubmit={(event) => void submit(event)}>
        <div className="seller-form-grid">
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
          </label>
          <label>
            Price
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              required
            />
          </label>
          <label>
            Compare at price
            <input
              type="number"
              step="0.01"
              value={form.compare_at_price}
              onChange={(event) => updateField('compare_at_price', event.target.value)}
            />
          </label>
          <label>
            Stock
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
            Category
            <select
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
            >
              <option value="">None</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Main image
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
          <legend>Selling format</legend>
          <p className="inline-note">
            How one unit in the customer&apos;s cart is sold. The price above is per unit.
          </p>
          <div className="seller-form-grid">
            <label>
              Sold as
              <select
                value={form.selling_unit}
                onChange={(event) => updateField('selling_unit', event.target.value as SellingUnit)}
              >
                {SELLING_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {SELLING_UNIT_LABELS[unit]}
                  </option>
                ))}
              </select>
            </label>
            {form.selling_unit === 'WEIGHT' ? (
              <>
                <label>
                  Weight / volume
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
                    <option value="">Choose unit</option>
                    {MEASURE_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {MEASURE_UNIT_LABELS[unit]}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              form.selling_unit !== 'PIECE' && (
                <label>
                  Pieces per {SELLING_UNIT_LABELS[form.selling_unit].toLowerCase()}
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
          <legend>Ordering requirements</legend>
          <p className="inline-note">
            Leave a field empty when it does not apply. Example: if you sell 2 Samosas per pack and
            require at least 10 Samosas per order, set &quot;Pieces per pack&quot; to 2 and
            &quot;Minimum physical pieces&quot; to 10 — customers must then order at least 5 packs.
          </p>
          <div className="seller-form-grid">
            <label>
              Minimum cart quantity
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
                Minimum physical pieces
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
              Minimum order amount for this product
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.minimum_order_amount}
                onChange={(event) => updateField('minimum_order_amount', event.target.value)}
              />
            </label>
            <label>
              Advance notice
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.lead_time_value}
                onChange={(event) => updateField('lead_time_value', event.target.value)}
              />
            </label>
            <label>
              Advance notice unit
              <select
                value={form.lead_time_unit}
                onChange={(event) =>
                  updateField('lead_time_unit', event.target.value as LeadTimeUnit)
                }
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </label>
          </div>
          <p className="inline-note">
            Advance notice is how long you need to prepare this product. Pickup times are offered
            only after the longest advance notice of all your products in the order.
          </p>
        </fieldset>
        <label>
          Description
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
          />
        </label>
        <label>
          Ingredients
          <textarea
            rows={3}
            value={form.ingredients}
            onChange={(event) => updateField('ingredients', event.target.value)}
          />
        </label>
        <label>
          Allergens
          <textarea
            rows={3}
            value={form.allergens}
            onChange={(event) => updateField('allergens', event.target.value)}
          />
        </label>
        <label className="seller-checkbox-row">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateField('is_active', event.target.checked)}
          />
          Active
        </label>
        <label className="seller-checkbox-row">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(event) => updateField('is_featured', event.target.checked)}
          />
          Featured
        </label>
        <div className="seller-actions">
          <button className="button" type="submit">
            Save product
          </button>
          {productId && (
            <button
              className="button button--danger"
              type="button"
              onClick={() => void removeProduct()}
            >
              Delete
            </button>
          )}
        </div>
        <span role="status">{status}</span>
      </form>

      {productId && (
        <div className="seller-content" style={{ marginTop: '24px' }}>
          <h3>Gallery images</h3>
          <div className="seller-gallery">
            {images.length === 0 && <p className="inline-error">No gallery images yet.</p>}
            {images.map((image) => (
              <div className="seller-gallery__item" key={image.id}>
                <img src={image.image_url} alt={image.alt_text} onError={handleProductImageError} />
                <span>{image.sort_order}</span>
                <button
                  className="button button--danger"
                  type="button"
                  onClick={() => void deleteGalleryImage(image.id)}
                >
                  Remove
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
              placeholder="Sort order"
              value={gallerySortOrder}
              onChange={(event) => setGallerySortOrder(event.target.value)}
            />
            <input
              type="text"
              maxLength={150}
              placeholder="Alt text"
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

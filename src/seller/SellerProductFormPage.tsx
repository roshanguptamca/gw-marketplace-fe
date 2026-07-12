import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { marketplaceService } from '../services/marketplaceService'
import type { SellerCategory, SellerProduct, SellerProductImage } from '../types/marketplace'
import { handleProductImageError } from '../utils/productImages'

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
    } catch {
      setStatus('Could not save product')
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

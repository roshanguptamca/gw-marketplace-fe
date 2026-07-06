import { useState } from 'react'
import type { Category, MarketplaceSearchFilters, Shop } from '../types/marketplace'

export interface MarketplaceSearchProps {
  categories: Category[]
  shops: Shop[]
  onSearch: (filters: MarketplaceSearchFilters) => void
  onClear: () => void
  loading?: boolean
}

const DEFAULT_MIN_PRICE = '0'
const DEFAULT_MAX_PRICE = '999'

export function MarketplaceSearch({
  categories,
  shops,
  onSearch,
  onClear,
  loading = false,
}: MarketplaceSearchProps) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [shop, setShop] = useState('')
  const [minPrice, setMinPrice] = useState(DEFAULT_MIN_PRICE)
  const [maxPrice, setMaxPrice] = useState(DEFAULT_MAX_PRICE)
  const [inStock, setInStock] = useState(false)

  function currentFilters(): MarketplaceSearchFilters {
    return {
      q: q.trim(),
      category,
      shop,
      minPrice: minPrice.trim(),
      maxPrice: maxPrice.trim(),
      inStock,
    }
  }

  function hasActiveFilters(filters: MarketplaceSearchFilters): boolean {
    return Boolean(
      filters.q ||
      filters.category ||
      filters.shop ||
      (filters.minPrice && filters.minPrice !== DEFAULT_MIN_PRICE) ||
      (filters.maxPrice && filters.maxPrice !== DEFAULT_MAX_PRICE) ||
      filters.inStock,
    )
  }

  function runSearch() {
    const filters = currentFilters()
    if (!hasActiveFilters(filters)) {
      onClear()
      return
    }
    onSearch(filters)
  }

  function clearFilters() {
    setQ('')
    setCategory('')
    setShop('')
    setMinPrice(DEFAULT_MIN_PRICE)
    setMaxPrice(DEFAULT_MAX_PRICE)
    setInStock(false)
    onClear()
  }

  return (
    <div className="market-search-card" role="search" aria-label="Marketplace search and filters">
      <div className="market-search-row">
        <label className="market-search-field market-search-field--query">
          <span>Search</span>
          <input
            type="text"
            placeholder="Products or shops…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') runSearch()
            }}
            aria-label="Search products or shops"
          />
        </label>

        <label className="market-search-field">
          <span>Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
                {item.productCount ? ` (${item.productCount})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="market-search-field">
          <span>Shop</span>
          <select
            value={shop}
            onChange={(event) => setShop(event.target.value)}
            aria-label="Filter by shop"
          >
            <option value="">All shops</option>
            {shops.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="market-search-field market-search-field--price">
          <span>Min €</span>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            aria-label="Minimum price in euros"
          />
        </label>

        <label className="market-search-field market-search-field--price">
          <span>Max €</span>
          <input
            type="number"
            min="0"
            placeholder="999"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            aria-label="Maximum price in euros"
          />
        </label>

        <label className="market-search-field market-search-field--checkbox">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(event) => setInStock(event.target.checked)}
            aria-label="In stock only"
          />
          <span>In stock</span>
        </label>

        <div className="market-search-actions">
          <button type="button" className="button" onClick={runSearch} disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
          <button type="button" className="button button--ghost" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}

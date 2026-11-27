import { apiRequest } from './apiClient'
import type { ShopEnquiry, ShopEnquiryInput, ShopPage, ShopPageInput } from '../types/marketplace'

const publicBase = (shop: string) => `/marketplace/shops/${encodeURIComponent(shop)}/pages/`

export const shopPageService = {
  listPublic: (shop: string) => apiRequest<ShopPage[]>(publicBase(shop)),
  getPublic: (shop: string, slug: string) =>
    apiRequest<ShopPage>(`${publicBase(shop)}${encodeURIComponent(slug)}/`),
  enquire: (shop: string, slug: string, data: ShopEnquiryInput) =>
    apiRequest<{ id: number }>(`${publicBase(shop)}${encodeURIComponent(slug)}/enquiries/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  list: () => apiRequest<ShopPage[]>('/seller/pages/'),
  create: (data: ShopPageInput) =>
    apiRequest<ShopPage>('/seller/pages/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ShopPageInput>) =>
    apiRequest<ShopPage>(`/seller/pages/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (id: number) => apiRequest<void>(`/seller/pages/${id}/`, { method: 'DELETE' }),
  enquiries: () => apiRequest<ShopEnquiry[]>('/seller/page-enquiries/'),
}

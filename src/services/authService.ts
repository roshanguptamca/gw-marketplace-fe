import type { User } from '../types/marketplace'
import { apiRequest } from './apiClient'

export const authService = {
  getCurrentUser: () => apiRequest<User>('/auth/me'),
  logout: () => apiRequest<{ message: string }>('/accounts/logout/', { method: 'POST' }),
}

import { apiFetch } from '@/shared/api/http'
import type { Tour } from '../model/types'

type ApiResponse<T> = {
  data: T
}

export const tourApi = {
  getAll: () => apiFetch<ApiResponse<Tour[]>>('/tours'),
  getById: (id: string) => apiFetch<ApiResponse<Tour>>(`/tours/${id}`),
  create: (payload: Tour) =>
    apiFetch<ApiResponse<Tour>>('/tours', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Tour) =>
    apiFetch<ApiResponse<Tour>>(`/tours/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiFetch<ApiResponse<boolean>>(`/tours/${id}`, {
      method: 'DELETE',
    }),
}
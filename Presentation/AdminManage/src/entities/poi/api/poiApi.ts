import { apiFetch } from '@/shared/api/http'
import type { Poi } from '../model/types'

type ApiResponse<T> = {
  data: T
}

export const poiApi = {
  getAll: () => apiFetch<ApiResponse<Poi[]>>('/pois'),
  getById: (id: string) => apiFetch<ApiResponse<Poi>>(`/pois/${id}`),
  create: (payload: Poi) =>
    apiFetch<ApiResponse<Poi>>('/pois', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Poi) =>
    apiFetch<ApiResponse<Poi>>(`/pois/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiFetch<ApiResponse<boolean>>(`/pois/${id}`, {
      method: 'DELETE',
    }),
}
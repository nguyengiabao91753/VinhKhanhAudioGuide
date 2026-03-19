import { apiFetch } from '@/shared/api/http'
import type { Tour } from '../model/types'

type ApiResponse<T> = {
  data: T
}

type ListResponse<T> = ApiResponse<T[]> | T[] | { items: T[] } | { result: T[] }

const normalizeListResponse = <T>(response: ListResponse<T>): ApiResponse<T[]> => {
  if (Array.isArray(response)) {
    return { data: response }
  }
  if (response && typeof response === 'object') {
    if ('data' in response && Array.isArray((response as ApiResponse<T[]>).data)) {
      return response as ApiResponse<T[]>
    }
    if ('items' in response && Array.isArray((response as { items: T[] }).items)) {
      return { data: (response as { items: T[] }).items }
    }
    if ('result' in response && Array.isArray((response as { result: T[] }).result)) {
      return { data: (response as { result: T[] }).result }
    }
  }
  return { data: [] as T[] }
}

export const tourApi = {
  getAll: async () => {
    const response = await apiFetch<ListResponse<Tour>>('/tours')
    return normalizeListResponse(response)
  },
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

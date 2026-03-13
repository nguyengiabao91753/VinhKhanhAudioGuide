import { apiFetch } from '@/shared/api/http'
import type { Poi, PoiFormPayload } from '../model/types'

type ApiResponse<T> = {
  data: T
}

const normalizePoiResponse = (response: Poi | ApiResponse<Poi>) => {
  if (response && typeof response === 'object' && 'data' in response) {
    return response as ApiResponse<Poi>
  }
  return { data: response as Poi }
}

const appendFormValue = (formData: FormData, key: string, value: unknown) => {
  if (value === null || value === undefined) return
  formData.append(key, String(value))
}

const buildPoiFormData = (payload: PoiFormPayload) => {
  const formData = new FormData()

  appendFormValue(formData, 'Order', payload.order)
  appendFormValue(formData, 'Range', payload.range)
  appendFormValue(formData, 'Position.Type', payload.position.type)
  appendFormValue(formData, 'Position.Lat', payload.position.lat)
  appendFormValue(formData, 'Position.Lng', payload.position.lng)

  payload.localizedData.forEach((item, index) => {
    appendFormValue(formData, `LocalizedData[${index}].LangCode`, item.langCode)
    appendFormValue(formData, `LocalizedData[${index}].Name`, item.name)
    appendFormValue(formData, `LocalizedData[${index}].Description`, item.description)
    appendFormValue(formData, `LocalizedData[${index}].DescriptionText`, item.descriptionText)
    appendFormValue(formData, `LocalizedData[${index}].DescriptionAudio`, item.descriptionAudio)
  })

  if (payload.thumbnailFile) {
    formData.append('Thumbnail', payload.thumbnailFile)
  }

  if (payload.bannerFile) {
    formData.append('Banner', payload.bannerFile)
  }

  return formData
}

export const poiApi = {
  getAll: () => apiFetch<ApiResponse<Poi[]>>('/pois'),
  getById: (id: string) => apiFetch<ApiResponse<Poi>>(`/pois/${id}`),
  create: async (payload: PoiFormPayload) => {
    const response = await apiFetch<Poi | ApiResponse<Poi>>('/pois', {
      method: 'POST',
      body: buildPoiFormData(payload),
    })
    return normalizePoiResponse(response)
  },
  update: async (id: string, payload: PoiFormPayload) => {
    const response = await apiFetch<Poi | ApiResponse<Poi>>(`/pois/${id}`, {
      method: 'PUT',
      body: buildPoiFormData(payload),
    })
    return normalizePoiResponse(response)
  },
  delete: (id: string) =>
    apiFetch<ApiResponse<boolean>>(`/pois/${id}`, {
      method: 'DELETE',
    }),
}

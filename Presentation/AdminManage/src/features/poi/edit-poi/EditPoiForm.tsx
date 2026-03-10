import { useState } from 'react'
import { poiApi } from '@/entities/poi/api/poiApi'
import type { Poi } from '@/entities/poi/model/types'
import { toastError, toastSuccess } from '@/shared/ui'
import { MapPicker } from '@/shared/ui/MapPicker'

type EditPoiFormProps = {
  poi: Poi
  onSuccess?: () => void
  onCancel?: () => void
}

export function EditPoiForm({ poi, onSuccess, onCancel }: EditPoiFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const viData =
    poi.localizedData.find((item) => item.langCode === 'vi') ??
    poi.localizedData[0]

  const [name, setName] = useState(viData?.name || '')
  const [range, setRange] = useState(poi.range)
  const [lat, setLat] = useState(poi.position.lat)
  const [lng, setLng] = useState(poi.position.lng)
  const [thumbnail, setThumbnail] = useState(poi.thumbnail)
  const [banner, setBanner] = useState(poi.banner)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSubmitting(true)
    setError('')

    const payload: Poi = {
      ...poi,
      range,
      thumbnail,
      banner,
      position: {
        ...poi.position,
        lat,
        lng,
      },
      localizedData: poi.localizedData.map((item) => ({
        ...item,
        name,
        description:
          item.langCode === 'vi'
            ? `Mô tả cập nhật cho ${name}`
            : `Updated description for ${name}`,
        descriptionText:
          item.langCode === 'vi'
            ? `Bài thuyết minh cập nhật cho ${name}`
            : `Updated narration for ${name}`,
      })),
    }

    try {
      await poiApi.update(poi.id, payload)
      toastSuccess(`Updated POI "${name}" successfully.`)
      onSuccess?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update POI'
      setError(message)
      toastError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="app-form">
      <h4 className="app-section-title">Edit POI</h4>

      <input
        className="app-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="POI name"
        required
      />

      <input
        className="app-input"
        type="number"
        value={range}
        onChange={(e) => setRange(Number(e.target.value))}
        placeholder="Range"
      />

      <div style={{ display: 'grid', gap: '12px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          <input
            className="app-input"
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => setLat(Number(e.target.value))}
            placeholder="Latitude"
            required
          />

          <input
            className="app-input"
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => setLng(Number(e.target.value))}
            placeholder="Longitude"
            required
          />
        </div>

        <MapPicker
          lat={lat}
          lng={lng}
          onChange={({ lat, lng }) => {
            setLat(lat)
            setLng(lng)
          }}
        />
      </div>

      <input
        className="app-input"
        value={thumbnail}
        onChange={(e) => setThumbnail(e.target.value)}
        placeholder="Thumbnail"
      />

      <input
        className="app-input"
        value={banner}
        onChange={(e) => setBanner(e.target.value)}
        placeholder="Banner"
      />

      {error && <div style={{ color: 'tomato' }}>Error: {error}</div>}

      <div className="app-inline-actions">
        <button className="app-button" type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
        <button className="app-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
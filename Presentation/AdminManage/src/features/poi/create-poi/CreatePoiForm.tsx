import { useState } from 'react'
import { poiApi } from '@/entities/poi/api/poiApi'
import type { Poi } from '@/entities/poi/model/types'
import { toastError, toastSuccess } from '@/shared/ui'
import { MapPicker } from '@/shared/ui/MapPicker'

type CreatePoiFormProps = {
  onSuccess?: () => void
}

export function CreatePoiForm({ onSuccess }: CreatePoiFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [range, setRange] = useState(10)
  const [lat, setLat] = useState(10.76)
  const [lng, setLng] = useState(106.7)
  const [thumbnail, setThumbnail] = useState('thumb.jpg')
  const [banner, setBanner] = useState('banner.jpg')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSubmitting(true)
    setError('')

    const payload: Poi = {
      id: '00000000-0000-0000-0000-000000000000',
      order: 0,
      range,
      thumbnail,
      banner,
      position: {
        type: 'Point',
        lat,
        lng,
      },
      localizedData: [
        {
          langCode: 'vi',
          name,
          description: `Mô tả cho ${name}`,
          descriptionText: `Bài thuyết minh cho ${name}`,
          descriptionAudio: 'vi-audio.mp3',
        },
        {
          langCode: 'en',
          name,
          description: `Description for ${name}`,
          descriptionText: `Narration for ${name}`,
          descriptionAudio: 'en-audio.mp3',
        },
      ],
    }

    try {
      await poiApi.create(payload)

      setName('')
      setRange(10)
      setLat(10.76)
      setLng(106.7)
      setThumbnail('thumb.jpg')
      setBanner('banner.jpg')

      toastSuccess(`Created POI "${name}" successfully.`)
      onSuccess?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create POI'
      setError(message)
      toastError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="app-form">
      <h3 className="app-section-title">Create POI</h3>

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

      <button className="app-button" type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Submit'}
      </button>
    </form>
  )
}
import { useEffect, useMemo, useState } from 'react'
import { poiApi } from '@/entities/poi/api/poiApi'
import { tourApi } from '@/entities/tour/api/tourApi'
import type { Poi } from '@/entities/poi/model/types'
import type { Tour } from '@/entities/tour/model/types'
import { toastError, toastSuccess } from '@/shared/ui'

type EditTourFormProps = {
  tour: Tour
  onSuccess?: () => void
  onCancel?: () => void
}

export function EditTourForm({
  tour,
  onSuccess,
  onCancel,
}: EditTourFormProps) {
  const [name, setName] = useState(tour.name)
  const [pois, setPois] = useState<Poi[]>([])
  const [selectedPoiIds, setSelectedPoiIds] = useState<string[]>(tour.poiIds)
  const [poiSearchKeyword, setPoiSearchKeyword] = useState('')
  const [loadingPois, setLoadingPois] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    poiApi
      .getAll()
      .then((res) => setPois(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingPois(false))
  }, [])

  const filteredPois = useMemo(() => {
    const keyword = poiSearchKeyword.trim().toLowerCase()
    if (!keyword) return pois

    return pois.filter((poi) =>
      poi.localizedData.some(
        (item) =>
          item.name.toLowerCase().includes(keyword) ||
          item.description.toLowerCase().includes(keyword)
      )
    )
  }, [pois, poiSearchKeyword])

  const handleCheckboxChange = (poiId: string) => {
    setSelectedPoiIds((prev) =>
      prev.includes(poiId)
        ? prev.filter((id) => id !== poiId)
        : [...prev, poiId]
    )
  }

  const movePoi = (index: number, direction: 'up' | 'down') => {
    setSelectedPoiIds((prev) => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1

      if (targetIndex < 0 || targetIndex >= next.length) return prev

      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const payload: Tour = {
      id: tour.id,
      name,
      poiIds: selectedPoiIds,
    }

    try {
    await tourApi.update(tour.id, payload)
    toastSuccess(`Updated tour "${name}" successfully.`)
    onSuccess?.()
    } catch (err) {
    toastError(err instanceof Error ? err.message : 'Failed to update tour')
    } finally {
    setSubmitting(false)
    }
  }

  const selectedPois = selectedPoiIds
    .map((id) => pois.find((poi) => poi.id === id))
    .filter(Boolean) as Poi[]

  return (
    <form onSubmit={handleSubmit} className="app-form">
      <h4 className="app-section-title">Edit Tour</h4>

      <input
        className="app-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tour name"
        required
      />

      <div>
        <strong>Select POIs</strong>

        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
          <input
            className="app-input"
            value={poiSearchKeyword}
            onChange={(e) => setPoiSearchKeyword(e.target.value)}
            placeholder="Search POIs to edit..."
          />
        </div>

        {loadingPois ? (
          <div>Loading POIs...</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '8px',
              maxHeight: '240px',
              overflowY: 'auto',
              border: '1px solid #444',
              padding: '12px',
              borderRadius: '8px',
            }}
          >
            {filteredPois.map((poi) => (
              <label
                key={poi.id}
                style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <input
                  type="checkbox"
                  checked={selectedPoiIds.includes(poi.id)}
                  onChange={() => handleCheckboxChange(poi.id)}
                />
                <span>{poi.localizedData?.[0]?.name || poi.id}</span>
              </label>
            ))}

            {filteredPois.length === 0 && (
              <div className="app-muted">No POIs matched your search.</div>
            )}
          </div>
        )}
      </div>

      <div>
        <strong>Selected POIs Order</strong>
        <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
          {selectedPois.length === 0 && <div>No POIs selected</div>}

          {selectedPois.map((poi, index) => (
            <div
              key={poi.id}
              className="app-card"
              style={{
                padding: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span>{poi.localizedData?.[0]?.name || poi.id}</span>

              <div className="app-inline-actions">
                <button
                  className="app-button"
                  type="button"
                  onClick={() => movePoi(index, 'up')}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  className="app-button"
                  type="button"
                  onClick={() => movePoi(index, 'down')}
                  disabled={index === selectedPois.length - 1}
                >
                  Down
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
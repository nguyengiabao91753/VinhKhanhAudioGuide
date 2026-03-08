import { useEffect, useMemo, useState } from 'react'
import { tourApi } from '@/entities/tour/api/tourApi'
import { poiApi } from '@/entities/poi/api/poiApi'
import type { Tour } from '@/entities/tour/model/types'
import type { Poi } from '@/entities/poi/model/types'
import { CreateTourForm } from '@/features/tour/create-tour/CreateTourForm'
import { DeleteTourButton } from '@/features/tour/delete-tour/DeleteTourButton'
import { EditTourForm } from '@/features/tour/edit-tour/EditTourForm'

type TourFilter = 'all' | 'single-poi' | 'multi-poi'

export function TourManagementPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTourId, setEditingTourId] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [tourFilter, setTourFilter] = useState<TourFilter>('all')

  const loadTours = async () => {
    const res = await tourApi.getAll()
    setTours(res.data)
  }

  const loadPois = async () => {
    const res = await poiApi.getAll()
    setPois(res.data)
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      await Promise.all([loadTours(), loadPois()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tours')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const poiNameMap = useMemo(() => {
    return new Map(
      pois.map((poi) => [poi.id, poi.localizedData?.[0]?.name || poi.id])
    )
  }, [pois])

  const filteredTours = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return tours.filter((tour) => {
      const matchesKeyword =
        !keyword ||
        tour.name.toLowerCase().includes(keyword) ||
        tour.poiIds.some((poiId) =>
          (poiNameMap.get(poiId) || '').toLowerCase().includes(keyword)
        )

      const matchesFilter =
        tourFilter === 'all' ||
        (tourFilter === 'single-poi' && tour.poiIds.length === 1) ||
        (tourFilter === 'multi-poi' && tour.poiIds.length > 1)

      return matchesKeyword && matchesFilter
    })
  }, [tours, searchKeyword, tourFilter, poiNameMap])

  if (loading) return <div>Loading Tours...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <div className="app-toolbar">
        <div>
          <h1 className="app-page-title">Tour Management</h1>
          <p className="app-page-subtitle">
            Total Tours: {filteredTours.length} / {tours.length}
          </p>
        </div>

        <div className="app-toolbar-actions">
          <button className="app-button" onClick={loadData}>
            Refresh
          </button>
          <button
            className="app-button"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? 'Close Create Form' : 'Create Tour'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '12px',
          marginBottom: '20px',
          maxWidth: '520px',
        }}
      >
        <label style={{ display: 'grid', gap: '6px' }}>
          <span className="app-muted">Search tours</span>
          <input
            className="app-input"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Search tours by name or POI name..."
          />
        </label>

        <label style={{ display: 'grid', gap: '6px' }}>
          <span className="app-muted">Filter tours</span>
          <select
            className="app-input"
            value={tourFilter}
            onChange={(e) => {
              const value = e.target.value as TourFilter
              setTourFilter(value)
            }}
          >
            <option value="all">All Tours</option>
            <option value="single-poi">Only 1 POI</option>
            <option value="multi-poi">More than 1 POI</option>
          </select>
        </label>
      </div>

      {showCreateForm && (
        <div style={{ marginBottom: '24px' }}>
          <CreateTourForm
            onSuccess={() => {
              setShowCreateForm(false)
              loadData()
            }}
          />
        </div>
      )}

      {filteredTours.length === 0 ? (
        <div className="app-card">
          <h3 style={{ marginTop: 0 }}>No tours found</h3>
          <p className="app-muted" style={{ marginBottom: 0 }}>
            Try changing the keyword/filter or create a new tour.
          </p>
        </div>
      ) : (
        <div className="app-grid">
          {filteredTours.map((tour) => {
            const isEditing = editingTourId === tour.id

            return (
              <div key={tour.id} className="app-card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: '28px' }}>{tour.name}</h3>
                    <div style={{ marginTop: '10px' }}>
                      <span className="app-chip">
                        POIs in Tour: {tour.poiIds.length}
                      </span>
                    </div>
                  </div>

                  <div className="app-inline-actions">
                    <button
                      className="app-button"
                      onClick={() =>
                        setEditingTourId((prev) =>
                          prev === tour.id ? null : tour.id
                        )
                      }
                    >
                      {isEditing ? 'Close Edit' : 'Edit'}
                    </button>

                    <DeleteTourButton
                      tourId={tour.id}
                      tourName={tour.name}
                      onDeleted={loadData}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <strong>POI Order</strong>
                  <ol style={{ marginTop: '10px', paddingLeft: '20px' }}>
                    {tour.poiIds.map((poiId) => (
                      <li key={poiId} style={{ marginBottom: '6px' }}>
                        {poiNameMap.get(poiId) || poiId}
                      </li>
                    ))}
                  </ol>
                </div>

                {isEditing && (
                  <EditTourForm
                    tour={tour}
                    onSuccess={() => {
                      setEditingTourId(null)
                      loadData()
                    }}
                    onCancel={() => setEditingTourId(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
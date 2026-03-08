import { useEffect, useMemo, useState } from 'react'
import { poiApi } from '@/entities/poi/api/poiApi'
import type { Poi } from '@/entities/poi/model/types'
import { CreatePoiForm } from '@/features/poi/create-poi/CreatePoiForm'
import { DeletePoiButton } from '@/features/poi/delete-poi/DeletePoiButton'
import { EditPoiForm } from '@/features/poi/edit-poi/EditPoiForm'

export function PoiManagementPage() {
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPoiId, setEditingPoiId] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')

  const loadPois = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await poiApi.getAll()
      setPois(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load POIs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPois()
  }, [])

  const filteredPois = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    if (!keyword) return pois

    return pois.filter((poi) => {
      const names = poi.localizedData.map((item) => item.name.toLowerCase())
      const descriptions = poi.localizedData.map((item) =>
        item.description.toLowerCase()
      )

      return (
        names.some((name) => name.includes(keyword)) ||
        descriptions.some((desc) => desc.includes(keyword)) ||
        poi.thumbnail.toLowerCase().includes(keyword) ||
        poi.banner.toLowerCase().includes(keyword)
      )
    })
  }, [pois, searchKeyword])

  if (loading) return <div>Loading POIs...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <div className="app-toolbar">
        <div>
          <h1 className="app-page-title">POI Management</h1>
          <p className="app-page-subtitle">
            Total POIs: {filteredPois.length} / {pois.length}
          </p>
        </div>

        <div className="app-toolbar-actions">
          <button className="app-button" onClick={loadPois}>
            Refresh
          </button>
          <button
            className="app-button"
            onClick={() => setShowCreateForm((prev) => !prev)}
          >
            {showCreateForm ? 'Close Create Form' : 'Create POI'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', maxWidth: '420px' }}>
        <input
          className="app-input"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="Search POI by name or description..."
        />
      </div>

      {showCreateForm && (
        <div style={{ marginBottom: '24px' }}>
          <CreatePoiForm
            onSuccess={() => {
              setShowCreateForm(false)
              loadPois()
            }}
          />
        </div>
      )}

      <div className="app-grid">
        {filteredPois.map((poi) => {
          const isEditing = editingPoiId === poi.id
          const poiName = poi.localizedData?.[0]?.name || poi.id

          return (
            <div key={poi.id} className="app-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '16px',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '28px' }}>{poiName}</h3>
                  <div className="app-list" style={{ marginTop: '10px' }}>
                    <div>
                      <span className="app-chip">Range: {poi.range}</span>
                    </div>
                    <div className="app-muted">
                      Position: {poi.position.lat}, {poi.position.lng}
                    </div>
                  </div>
                </div>

                <div className="app-inline-actions">
                  <button
                    className="app-button"
                    onClick={() =>
                      setEditingPoiId((prev) => (prev === poi.id ? null : poi.id))
                    }
                  >
                    {isEditing ? 'Close Edit' : 'Edit'}
                  </button>

                  <DeletePoiButton
                    poiId={poi.id}
                    poiName={poiName}
                    onDeleted={loadPois}
                  />
                </div>
              </div>

              {isEditing && (
                <EditPoiForm
                  poi={poi}
                  onSuccess={() => {
                    setEditingPoiId(null)
                    loadPois()
                  }}
                  onCancel={() => setEditingPoiId(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
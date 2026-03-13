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

type PoiFilter = 'all' | 'major' | 'minor'

export function EditTourForm({ tour, onSuccess, onCancel }: EditTourFormProps) {
  const [name, setName] = useState(tour.name)
  const [description, setDescription] = useState(tour.description || '')
  const [durationMinutes, setDurationMinutes] = useState(
    tour.durationMinutes || 120
  )
  const [pois, setPois] = useState<Poi[]>([])
  const [selectedPoiIds, setSelectedPoiIds] = useState<string[]>(tour.poiIds)
  const [poiSearchKeyword, setPoiSearchKeyword] = useState('')
  const [poiFilter, setPoiFilter] = useState<PoiFilter>('all')
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
    return pois.filter((poi) => {
      const matchesKeyword = !keyword
        ? true
        : poi.localizedData.some(
            (item) =>
              item.name.toLowerCase().includes(keyword) ||
              item.description.toLowerCase().includes(keyword)
          )

      const viData = poi.localizedData.find((item) => item.langCode === 'vi') ??
        poi.localizedData[0]
      const category = viData?.descriptionAudio || 'MAIN'
      const isMajor = category === 'MAIN'
      const matchesFilter =
        poiFilter === 'all' || (poiFilter === 'major' ? isMajor : !isMajor)

      return matchesKeyword && matchesFilter
    })
  }, [pois, poiSearchKeyword, poiFilter])

  const handleCheckboxChange = (poiId: string) => {
    setSelectedPoiIds((prev) =>
      prev.includes(poiId) ? prev.filter((id) => id !== poiId) : [...prev, poiId]
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
      description,
      durationMinutes,
      createdAt: tour.createdAt,
      poiIds: selectedPoiIds,
    }

    try {
      await tourApi.update(tour.id, payload)
      toastSuccess(`Đã cập nhật tour "${name}" thành công.`)
      onSuccess?.()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Không thể cập nhật tour')
      setError(err instanceof Error ? err.message : 'Không thể cập nhật tour')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedPois = selectedPoiIds
    .map((id) => pois.find((poi) => poi.id === id))
    .filter(Boolean) as Poi[]

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="form-column">
        <label className="form-label">Tên tour</label>
        <input
          className="app-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Đêm Ẩm Thực Vĩnh Khánh"
          required
        />

        <label className="form-label">Mô tả</label>
        <textarea
          className="app-input app-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả ngắn về hành trình này..."
          rows={3}
        />

        <label className="form-label">Thời lượng (phút)</label>
        <input
          className="app-input"
          type="number"
          min={30}
          max={600}
          step={15}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
        />

        <div className="poi-selector">
          <div className="poi-selector-header">
            <strong>Chọn POIs</strong>
            <span className="app-muted">
              {selectedPoiIds.length}/{pois.length}
            </span>
          </div>

          <input
            className="app-input"
            value={poiSearchKeyword}
            onChange={(e) => setPoiSearchKeyword(e.target.value)}
            placeholder="Tìm kiếm POIs..."
          />

          <div className="app-inline-actions" style={{ marginTop: 8 }}>
            <button
              className={`app-button ${poiFilter === 'all' ? 'primary' : ''}`}
              type="button"
              onClick={() => setPoiFilter('all')}
            >
              Tất cả
            </button>
            <button
              className={`app-button ${poiFilter === 'major' ? 'primary' : ''}`}
              type="button"
              onClick={() => setPoiFilter('major')}
            >
              Điểm chính
            </button>
            <button
              className={`app-button ${poiFilter === 'minor' ? 'primary' : ''}`}
              type="button"
              onClick={() => setPoiFilter('minor')}
            >
              Điểm phụ
            </button>
          </div>

          {loadingPois ? (
            <div className="app-muted">Đang tải POIs...</div>
          ) : (
            <div className="poi-selector-list">
              {filteredPois.map((poi) => (
                <label key={poi.id} className="poi-selector-item">
                  <input
                    type="checkbox"
                    checked={selectedPoiIds.includes(poi.id)}
                    onChange={() => handleCheckboxChange(poi.id)}
                  />
                  <span>{poi.localizedData?.[0]?.name || poi.id}</span>
                </label>
              ))}

              {filteredPois.length === 0 && (
                <div className="app-muted">Không có POI phù hợp.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="form-column">
        <div className="tour-order-card">
          <h4>Thứ tự POIs trong tour</h4>
          <div className="tour-order-list">
            {selectedPois.length === 0 && (
              <div className="app-muted">Chưa chọn POI nào.</div>
            )}

            {selectedPois.map((poi, index) => (
              <div key={poi.id} className="tour-order-item">
                <span className="tour-order-index">{index + 1}</span>
                <span>{poi.localizedData?.[0]?.name || poi.id}</span>
                <div className="app-inline-actions">
                  <button
                    className="app-icon-button"
                    type="button"
                    onClick={() => movePoi(index, 'up')}
                    disabled={index === 0}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 6l6 6H6l6-6z" fill="currentColor" />
                    </svg>
                  </button>
                  <button
                    className="app-icon-button"
                    type="button"
                    onClick={() => movePoi(index, 'down')}
                    disabled={index === selectedPois.length - 1}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 18l-6-6h12l-6 6z" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="form-error">Lỗi: {error}</div>}

        <div className="form-actions">
          <button
            className="app-button primary"
            type="submit"
            disabled={submitting || selectedPoiIds.length === 0 || !name.trim()}
          >
            {submitting ? 'Đang lưu...' : 'Lưu tour'}
          </button>
          <button className="app-button" type="button" onClick={onCancel}>
            Hủy
          </button>
        </div>
      </div>
    </form>
  )
}

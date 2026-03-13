import { useEffect, useMemo, useState } from 'react'
import { tourApi } from '@/entities/tour/api/tourApi'
import { poiApi } from '@/entities/poi/api/poiApi'
import type { Tour } from '@/entities/tour/model/types'
import type { Poi } from '@/entities/poi/model/types'
import { CreateTourForm } from '@/features/tour/create-tour/CreateTourForm'
import { DeleteTourButton } from '@/features/tour/delete-tour/DeleteTourButton'
import { EditTourForm } from '@/features/tour/edit-tour/EditTourForm'
import { EmptyState, Modal } from '@/shared/ui'

export function TourManagementPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTour, setEditingTour] = useState<Tour | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')

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
      setError(err instanceof Error ? err.message : 'Không thể tải tour')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const poiNameMap = useMemo(
    () =>
      new Map(pois.map((poi) => [poi.id, poi.localizedData?.[0]?.name || poi.id])),
    [pois]
  )

  const filteredTours = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return tours.filter((tour) => {
      const matchesKeyword =
        !keyword ||
        tour.name.toLowerCase().includes(keyword) ||
        (tour.description || '').toLowerCase().includes(keyword) ||
        tour.poiIds.some((poiId) =>
          (poiNameMap.get(poiId) || '').toLowerCase().includes(keyword)
        )

      return matchesKeyword
    })
  }, [tours, searchKeyword, poiNameMap])

  return (
    <div className="app-page">
      <div className="page-header page-header-actions">
        <div>
          <h1 className="page-title">Tours Management</h1>
          <p className="page-subtitle">
            Thiết kế và quản lý các hành trình khám phá ẩm thực
          </p>
        </div>

        <button
          className="app-button primary"
          type="button"
          onClick={() => setShowCreateForm(true)}
        >
          + Tạo Tour mới
        </button>
      </div>

      <div className="tour-toolbar">
        <input
          className="app-input"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="Tìm kiếm theo tên tour hoặc POI..."
        />
      </div>

      {loading ? <div className="app-muted">Đang tải Tours...</div> : null}
      {error ? <div className="app-alert app-alert-danger">Lỗi: {error}</div> : null}

      {!loading && filteredTours.length === 0 ? (
        <EmptyState
          title="Chưa có Tour nào"
          description="Hãy tạo tour mới hoặc điều chỉnh từ khoá tìm kiếm."
          actionLabel="Tạo Tour mới"
          onAction={() => setShowCreateForm(true)}
        />
      ) : (
        <div className="tour-grid">
          {filteredTours.map((tour) => {
            const poiCount = tour.poiIds.length
            const durationLabel = formatDuration(tour, poiCount)
            const description =
              tour.description && tour.description.trim().length > 0
                ? tour.description
                : getTourDescription(tour.name)
            const createdLabel = tour.createdAt
              ? new Date(tour.createdAt).toLocaleDateString('vi-VN')
              : 'Chưa có ngày tạo'
            return (
              <article key={tour.id} className="tour-card">
                <div className="tour-card-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M4 6a2 2 0 012-2h9a2 2 0 012 2v2h3a2 2 0 012 2v7a3 3 0 01-3 3H6a2 2 0 01-2-2V6zm12 4V6H6v12h12a1 1 0 001-1v-6h-3zm-8 2h6v2H8v-2z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div className="tour-card-body">
                  <div className="tour-card-header">
                    <h3>{tour.name}</h3>
                    <div className="tour-card-actions">
                      <button
                        className="app-icon-button"
                        type="button"
                        onClick={() => setEditingTour(tour)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l8.06-8.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 000-1.42l-2.34-2.34a1 1 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      <DeleteTourButton
                        tourId={tour.id}
                        tourName={tour.name}
                        onDeleted={loadData}
                        variant="icon"
                      />
                    </div>
                  </div>
                  <p className="tour-card-desc">{description}</p>
                  <div className="tour-card-meta">
                    <span>{poiCount} địa điểm</span>
                    <span>{durationLabel}</span>
                    <span>{createdLabel}</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={showCreateForm}
        title="Tạo Tour mới"
        size="lg"
        onClose={() => setShowCreateForm(false)}
      >
        <CreateTourForm
          onSuccess={() => {
            setShowCreateForm(false)
            loadData()
          }}
        />
      </Modal>

      <Modal
        open={Boolean(editingTour)}
        title="Chỉnh sửa Tour"
        size="lg"
        onClose={() => setEditingTour(null)}
      >
        {editingTour ? (
          <EditTourForm
            tour={editingTour}
            onSuccess={() => {
              setEditingTour(null)
              loadData()
            }}
            onCancel={() => setEditingTour(null)}
          />
        ) : null}
      </Modal>
    </div>
  )
}

const getDurationLabel = (count: number) => {
  if (count <= 1) return '1-2 giờ'
  if (count <= 3) return '2-3 giờ'
  return '3-4 giờ'
}

const getTourDescription = (name: string) => {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('hải sản')) {
    return 'Tập trung vào các quán hải sản nổi tiếng.'
  }
  if (lowerName.includes('đêm') || lowerName.includes('ẩm thực')) {
    return 'Hành trình khám phá những món ăn đặc trưng của phố ẩm thực.'
  }
  return 'Hành trình khám phá ẩm thực đường phố Vĩnh Khánh.'
}

const formatDuration = (tour: Tour, poiCount: number) => {
  if (tour.durationMinutes && tour.durationMinutes > 0) {
    const hours = (tour.durationMinutes / 60).toFixed(1)
    return `${hours} giờ`
  }
  return getDurationLabel(poiCount)
}

import { useEffect, useMemo, useState } from 'react'
import { poiApi } from '@/entities/poi/api/poiApi'
import type { Poi } from '@/entities/poi/model/types'
import { CreatePoiForm } from '@/features/poi/create-poi/CreatePoiForm'
import { DeletePoiButton } from '@/features/poi/delete-poi/DeletePoiButton'
import { EditPoiForm } from '@/features/poi/edit-poi/EditPoiForm'
import { EmptyState, Modal } from '@/shared/ui'

type CategoryFilter = 'all' | 'MAIN' | 'WC' | 'TICKET' | 'PARKING' | 'BOAT'

const categoryLabelMap: Record<CategoryFilter, string> = {
  all: 'Tất cả',
  MAIN: 'Điểm chính',
  WC: 'WC',
  TICKET: 'Bán vé',
  PARKING: 'Gửi xe',
  BOAT: 'Bến thuyền',
}

const getPoiCategory = (poi: Poi): CategoryFilter => {
  const viData =
    poi.localizedData.find((item) => item.langCode === 'vi') ??
    poi.localizedData[0]
  const raw = viData?.descriptionAudio
  if (raw === 'MAIN' || raw === 'WC' || raw === 'TICKET' || raw === 'PARKING' || raw === 'BOAT') {
    return raw
  }
  return 'MAIN'
}

export function PoiManagementPage() {
  const [pois, setPois] = useState<Poi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPoi, setEditingPoi] = useState<Poi | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  const loadPois = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await poiApi.getAll()
      setPois(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách POIs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPois()
  }, [])

  const filteredPois = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return pois.filter((poi) => {
      const names = poi.localizedData.map((item) => item.name.toLowerCase())
      const descriptions = poi.localizedData.map((item) =>
        item.description.toLowerCase()
      )
      const addresses = poi.localizedData.map((item) =>
        (item.descriptionText || '').toLowerCase()
      )
      const matchesKeyword =
        !keyword ||
        names.some((name) => name.includes(keyword)) ||
        descriptions.some((desc) => desc.includes(keyword)) ||
        addresses.some((addr) => addr.includes(keyword))

      const matchesCategory =
        categoryFilter === 'all' || getPoiCategory(poi) === categoryFilter

      return matchesKeyword && matchesCategory
    })
  }, [pois, searchKeyword, categoryFilter])

  const poiCountLabel = `${filteredPois.length} / ${pois.length}`

  return (
    <div className="app-page">
      <div className="page-header page-header-actions">
        <div>
          <h1 className="page-title">Points of Interest</h1>
          <p className="page-subtitle">
            Quản lý các địa điểm ẩm thực trên phố Vĩnh Khánh
          </p>
        </div>

        <button
          className="app-button primary"
          type="button"
          onClick={() => setShowCreateForm(true)}
        >
          + Thêm POI mới
        </button>
      </div>

      <div className="poi-toolbar">
        <div className="poi-search">
          <input
            className="app-input"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm kiếm theo tên hoặc địa chỉ..."
          />
        </div>
        <div className="poi-filter">
          <div className="poi-filter-select">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3 5h18l-7 8v6l-4 2v-8L3 5z"
                fill="currentColor"
              />
            </svg>
            <select
              className="app-input"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as CategoryFilter)
              }
            >
              {Object.entries(categoryLabelMap).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <span className="poi-filter-count">{poiCountLabel}</span>
        </div>
      </div>

      {loading ? <div className="app-muted">Đang tải POIs...</div> : null}
      {error ? <div className="app-alert app-alert-danger">Lỗi: {error}</div> : null}

      {!loading && filteredPois.length === 0 ? (
        <EmptyState
          title="Chưa có POI nào"
          description="Hãy tạo POI mới hoặc điều chỉnh bộ lọc để xem dữ liệu."
          actionLabel="Tạo POI mới"
          onAction={() => setShowCreateForm(true)}
        />
      ) : (
        <div className="poi-grid">
          {filteredPois.map((poi) => {
            const viData =
              poi.localizedData.find((item) => item.langCode === 'vi') ??
              poi.localizedData[0]
            const poiName = viData?.name || poi.id
            const description = viData?.description || 'Chưa có mô tả'
            const address = viData?.descriptionText || 'Chưa cập nhật địa chỉ'
            const category = getPoiCategory(poi)
            const cover = poi.banner || poi.thumbnail || ''

            return (
              <article key={poi.id} className="poi-card">
                <div
                  className="poi-card-cover"
                  style={{
                    backgroundImage: cover ? `url(${cover})` : undefined,
                  }}
                >
                  <span className="poi-card-chip">{categoryLabelMap[category]}</span>
                </div>
                <div className="poi-card-body">
                  <h3 className="poi-card-title">{poiName}</h3>
                  <p className="poi-card-desc">{description}</p>
                  <div className="poi-card-meta">
                    <div className="poi-card-address">{address}</div>
                    <div className="poi-card-coordinates">
                      {poi.position.lat.toFixed(4)}, {poi.position.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
                <div className="poi-card-actions">
                  <button
                    className="app-icon-button"
                    type="button"
                    onClick={() => setEditingPoi(poi)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l8.06-8.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 000-1.42l-2.34-2.34a1 1 0 00-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <DeletePoiButton
                    poiId={poi.id}
                    poiName={poiName}
                    onDeleted={loadPois}
                    variant="icon"
                  />
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={showCreateForm}
        title="Thêm POI mới"
        size="lg"
        onClose={() => setShowCreateForm(false)}
      >
        <CreatePoiForm
          onSuccess={() => {
            setShowCreateForm(false)
            loadPois()
          }}
        />
      </Modal>

      <Modal
        open={Boolean(editingPoi)}
        title="Chỉnh sửa POI"
        size="lg"
        onClose={() => setEditingPoi(null)}
      >
        {editingPoi ? (
          <EditPoiForm
            poi={editingPoi}
            onSuccess={() => {
              setEditingPoi(null)
              loadPois()
            }}
            onCancel={() => setEditingPoi(null)}
          />
        ) : null}
      </Modal>
    </div>
  )
}

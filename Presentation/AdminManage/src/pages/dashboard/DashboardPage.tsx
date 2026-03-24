import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { poiApi } from '@/entities/poi'
import { tourApi } from '@/entities/tour'
import type { Poi } from '@/entities/poi/model/types'
import type { Tour } from '@/entities/tour/model/types'
import QrCodeDisplay from '@/components/QrCodeDisplay'

type DashboardStats = {
  poiCount: number
  tourCount: number
  viewCount: number
  userCount: number
  loading: boolean
  error: string | null
}

const fallbackActivities = [
  {
    title: 'Admin đã cập nhật POI "Ốc Oanh"',
    meta: '10 phút trước · Chỉnh sửa tọa độ',
  },
  {
    title: 'Admin đã cập nhật POI "Ốc Oanh"',
    meta: '10 phút trước · Chỉnh sửa tọa độ',
  },
  {
    title: 'Admin đã cập nhật POI "Ốc Oanh"',
    meta: '10 phút trước · Chỉnh sửa tọa độ',
  },
]

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats>({
    poiCount: 0,
    tourCount: 0,
    viewCount: 1200,
    userCount: 450,
    loading: true,
    error: null,
  })
  const [pois, setPois] = useState<Poi[]>([])
  const [tours, setTours] = useState<Tour[]>([])

  useEffect(() => {
    async function fetchStats() {
      try {
        setStats((prev) => ({ ...prev, loading: true, error: null }))
        const [poiRes, tourRes] = await Promise.all([
          poiApi.getAll(),
          tourApi.getAll(),
        ])

        const nextPois = Array.isArray(poiRes.data) ? poiRes.data : []
        const nextTours = Array.isArray(tourRes.data) ? tourRes.data : []

        const poiCount = nextPois.length
        const tourCount = nextTours.length
        const viewCount = Math.max(1200, poiCount * 45 + tourCount * 110)
        const userCount = Math.max(450, poiCount * 12 + tourCount * 35)

        setPois(nextPois)
        setTours(nextTours)
        setStats({
          poiCount,
          tourCount,
          viewCount,
          userCount,
          loading: false,
          error: null,
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Không thể tải dữ liệu dashboard'
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }))
      }
    }

    fetchStats()
  }, [])

  const activities = useMemo(() => {
    if (pois.length === 0) return fallbackActivities
    return pois.slice(0, 3).map((poi) => ({
      title: `Admin đã cập nhật POI "${poi.localizedData?.[0]?.name || poi.id}"`,
      meta: '10 phút trước · Chỉnh sửa tọa độ',
    }))
  }, [pois])

  return (
    <div className="app-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chào mừng trở lại, Admin!</h1>
          <p className="page-subtitle">
            Dưới đây là tổng quan về hệ thống Vinh Khánh Food Street.
          </p>
        </div>
      </div>

      {stats.error ? (
        <div className="app-alert app-alert-danger">Lỗi: {stats.error}</div>
      ) : null}

      <div className="stats-grid">
        <StatCard
          title="Tổng POIs"
          value={stats.loading ? '...' : stats.poiCount.toString()}
          tone="green"
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2a6 6 0 00-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 00-6-6zm0 9a3 3 0 110-6 3 3 0 010 6z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <StatCard
          title="Tổng Tours"
          value={stats.loading ? '...' : stats.tourCount.toString()}
          tone="blue"
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 6a2 2 0 012-2h9a2 2 0 012 2v2h3a2 2 0 012 2v7a3 3 0 01-3 3H6a2 2 0 01-2-2V6zm12 4V6H6v12h12a1 1 0 001-1v-6h-3zm-8 2h6v2H8v-2z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <StatCard
          title="Lượt xem"
          value={stats.loading ? '...' : formatCompact(stats.viewCount)}
          tone="orange"
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 12l4 4 8-8 4 4V6h-6l4 4-8 8-4-4-6-6z"
                fill="currentColor"
              />
            </svg>
          }
        />
        <StatCard
          title="Người dùng"
          value={stats.loading ? '...' : stats.userCount.toString()}
          tone="purple"
          icon={
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 12a4 4 0 118 0 4 4 0 01-8 0zm-5 9a7 7 0 0114 0H2zm15 0a7 7 0 0114 0h-5z"
                fill="currentColor"
              />
            </svg>
          }
        />
      </div>

      <QrCodeDisplay />

      <div className="dashboard-grid">
        <div className="app-card">
          <h3 className="section-title">Hoạt động gần đây</h3>
          <div className="activity-list">
            {activities.map((item, index) => (
              <div key={`${item.title}-${index}`} className="activity-item">
                <div className="activity-avatar">VK</div>
                <div>
                  <p className="activity-title">{item.title}</p>
                  <p className="activity-meta">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="app-card app-card-highlight">
          <div className="growth-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 16l5-5 4 4 6-7 1 1-7 8-4-4-4 4-1-1z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h3 className="section-title">Tăng trưởng ổn định</h3>
          <p className="app-muted">
            Lượng khách sử dụng GPS tăng 15% so với tháng trước.
          </p>
          <button className="app-link-button" type="button">
            Xem báo cáo chi tiết
          </button>
        </div>
      </div>

      {tours.length === 0 && !stats.loading ? (
        <div className="app-card app-card-muted">
          <p className="app-muted">
            Chưa có tour nào được tạo. Hãy bắt đầu từ trang Tours Management.
          </p>
        </div>
      ) : null}
    </div>
  )
}

type StatCardProps = {
  title: string
  value: string
  tone: 'green' | 'blue' | 'orange' | 'purple'
  icon: ReactNode
}

const StatCard = ({ title, value, tone, icon }: StatCardProps) => (
  <div className={`stat-card stat-card-${tone}`}>
    <div className="stat-icon">{icon}</div>
    <div>
      <p className="stat-title">{title}</p>
      <h3 className="stat-value">{value}</h3>
    </div>
  </div>
)

const formatCompact = (value: number) => {
  if (value < 1000) return value.toString()
  return `${(value / 1000).toFixed(1)}k`
}

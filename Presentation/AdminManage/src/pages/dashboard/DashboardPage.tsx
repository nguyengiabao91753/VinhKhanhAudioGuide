import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { poiApi } from '@/entities/poi'
import { tourApi } from '@/entities/tour'
import type { Poi } from '@/entities/poi/model/types'
import type { Tour } from '@/entities/tour/model/types'
import { useActiveUsersSse } from '@/shared/hooks/useActiveUsersSse'
import UserOnlineMap from '@/widgets/active-users/UserOnlineMap'
import TopActivePoisCard from '@/widgets/active-users/TopActivePoisCard'
import { OnlineTrendCard } from '@/widgets/online-trend'
import { CurrentTimeCard } from '@/widgets/current-time'

type DashboardStats = {
  poiCount: number
  tourCount: number
  viewCount: number
  userCount: number
  desktop: number
  mobile: number
  loading: boolean
  error: string | null
}

type SessionItem = {
  sessionId: string
  lang?: string
  currentPoiId?: string | null
  currentPoiName?: string | null
  tourId?: string | null
  tourName?: string | null
  lat?: number | null
  lng?: number | null
  device?: string
  deviceType?: 'mobile' | 'desktop' | string
  deviceDisplayName?: string
  deviceInstanceId?: string
  onlineSeconds: number
}

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats>({
    poiCount: 0,
    tourCount: 0,
    viewCount: 1200,
    userCount: 450,
    desktop: 0,
    mobile: 0,
    loading: true,
    error: null,
  })

  const [pois, setPois] = useState<Poi[]>([])
  const [tours, setTours] = useState<Tour[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const { data: activeUsersData } = useActiveUsersSse()

  const sessions = (activeUsersData.sessions ?? []) as SessionItem[]

  const getPoiLabel = (poiId: string) => {
    const poi = pois.find((p) => String(p.id) === poiId)
    if (!poi) return poiId

    return (
      poi.localizedData?.find((x: any) => x.langCode === 'vi')?.name ||
      poi.localizedData?.[0]?.name ||
      poiId
    )
  }

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

        const desktop =
          typeof (activeUsersData as any).desktop === 'number'
            ? (activeUsersData as any).desktop
            : sessions.filter((s) => s.deviceType === 'desktop').length

        const mobile =
          typeof (activeUsersData as any).mobile === 'number'
            ? (activeUsersData as any).mobile
            : sessions.filter((s) => s.deviceType === 'mobile').length

        setPois(nextPois)
        setTours(nextTours)

        setStats({
          poiCount,
          tourCount,
          viewCount,
          userCount,
          desktop,
          mobile,
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
  }, [activeUsersData, sessions])

  useEffect(() => {
    if (!sessions.length) {
      setSelectedSessionId('')
      return
    }

    const stillExists = sessions.some(
      (session) => session.sessionId === selectedSessionId
    )

    if (!stillExists) {
      setSelectedSessionId(sessions[0].sessionId)
    }
  }, [sessions, selectedSessionId])

  const selectedSession = useMemo(() => {
    return (
      sessions.find((session) => session.sessionId === selectedSessionId) ||
      sessions[0] ||
      null
    )
  }, [sessions, selectedSessionId])

  const formatOnlineDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60

    if (mins <= 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  const shortSessionId = (sessionId: string) => {
    if (!sessionId) return '-'
    if (sessionId.length <= 18) return sessionId
    return `${sessionId.slice(0, 8)}...${sessionId.slice(-6)}`
  }

  return (
    <div className="app-page">
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 className="page-title">Chào mừng trở lại, Admin!</h1>
          <p className="page-subtitle">
            Dưới đây là tổng quan về hệ thống Vinh Khánh Food Street.
          </p>
        </div>

        <CurrentTimeCard />
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

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '16px 20px',
            background: '#fdfeed',
            minHeight: '100px',
            boxShadow:
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: '30px', height: '30px', color: '#16a34a' }}
            >
              <rect x="3" y="5" width="13" height="9" rx="2" />
              <path d="M8 19h3" />
              <path d="M19 8v8a2 2 0 0 1-2 2h-5" />
            </svg>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              flex: 1,
              gap: '12px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 2 }}>
                Mobile
              </div>
              <div
                style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}
              >
                {stats.mobile}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 2 }}>
                Desktop
              </div>
              <div
                style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}
              >
                {stats.desktop}
              </div>
            </div>
          </div>
        </div>

        <StatCard
          title="Đang Online"
          value={stats.loading ? '...' : activeUsersData.total.toString()}
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr 1fr',
          gap: 24,
          marginTop: 24,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            minWidth: 0,
            height: '100%',
            display: 'flex',
          }}
        >
          <div style={{ flex: 1 }}>
            <UserOnlineMap />
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            height: '100%',
            minHeight: 430,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 12 }}>Phiên đang hoạt động</h3>

          <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 14 }}>
            Tổng số phiên online: {activeUsersData.total}
          </p>

          {sessions.length === 0 ? (
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 16,
                color: '#6b7280',
                background: '#f9fafb',
              }}
            >
              Chưa có phiên nào đang online
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: 12,
                maxHeight: 300,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {sessions.map((session) => {
                const isSelected = session.sessionId === selectedSession?.sessionId

                return (
                  <button
                    key={session.sessionId}
                    type="button"
                    onClick={() => setSelectedSessionId(session.sessionId)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: isSelected
                        ? '1px solid #16a34a'
                        : '1px solid #e5e7eb',
                      background: isSelected ? '#f0fdf4' : '#fff',
                      borderRadius: 12,
                      padding: 14,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 6,
                      }}
                    >
                      <strong style={{ color: '#111827' }}>
                        {shortSessionId(session.sessionId)}
                      </strong>

                      <span
                        style={{
                          color: '#16a34a',
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatOnlineDuration(session.onlineSeconds)}
                      </span>
                    </div>

                    <div style={{ color: '#6b7280', fontSize: 14 }}>
                      Ngôn ngữ: {session.lang || '-'}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: 14 }}>
                      Thiết bị: {session.deviceDisplayName || session.device || '-'}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            height: '100%',
            minHeight: 430,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 12 }}>Chi tiết phiên</h3>

          {!selectedSession ? (
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 16,
                color: '#6b7280',
                background: '#f9fafb',
              }}
            >
              Chưa có dữ liệu phiên
            </div>
          ) : (
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 16,
                background: '#fff',
                display: 'grid',
                gap: 12,
                lineHeight: 1.6,
                flex: 1,
              }}
            >
              <div>
                <strong>Session:</strong> {shortSessionId(selectedSession.sessionId)}
              </div>
              <div>
                <strong>Ngôn ngữ:</strong> {selectedSession.lang || '-'}
              </div>
              <div>
                <strong>Thiết bị:</strong>{' '}
                {selectedSession.deviceDisplayName || selectedSession.device || '-'}
              </div>
              <div>
                <strong>POI:</strong>{' '}
                {selectedSession.currentPoiName ||
                  (selectedSession.currentPoiId
                    ? getPoiLabel(selectedSession.currentPoiId)
                    : '-')}
              </div>
              <div>
                <strong>Tour:</strong>{' '}
                {selectedSession.tourName || selectedSession.tourId || '-'}
              </div>
              <div>
                <strong>GPS:</strong>{' '}
                {typeof selectedSession.lat === 'number' &&
                typeof selectedSession.lng === 'number'
                  ? `${selectedSession.lat}, ${selectedSession.lng}`
                  : 'Chưa có'}
              </div>
              <div>
                <strong>Online:</strong>{' '}
                {formatOnlineDuration(selectedSession.onlineSeconds)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.7fr 1fr',
          gap: 24,
          marginTop: 24,
          alignItems: 'stretch',
        }}
      >
        <OnlineTrendCard />

        <TopActivePoisCard
          sessions={sessions}
          getPoiLabel={getPoiLabel}
        />
      </div>

      {tours.length === 0 && !stats.loading ? (
        <div className="app-card app-card-muted" style={{ marginTop: 24 }}>
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
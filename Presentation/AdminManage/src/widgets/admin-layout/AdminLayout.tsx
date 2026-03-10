import { Link, Outlet, useLocation } from 'react-router-dom'
import { ToastContainer } from '@/shared/ui'

export function AdminLayout() {
  const location = useLocation()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <aside
        style={{
          width: '260px',
          borderRight: '1px solid #e5e7eb',
          padding: '24px 18px',
          background: '#ffffff',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 800,
            color: '#111827',
          }}
        >
          GPS Admin
        </h2>

        <p
          className="app-muted"
          style={{ marginTop: '8px', marginBottom: '24px' }}
        >
          Vinh Khanh Food Street
        </p>

        <nav style={{ display: 'grid', gap: '10px' }}>
          <Link
            to="/pois"
            className={`app-sidebar-link ${
              location.pathname === '/pois' ? 'active' : ''
            }`}
          >
            POI Management
          </Link>

          <Link
            to="/tours"
            className={`app-sidebar-link ${
              location.pathname === '/tours' ? 'active' : ''
            }`}
          >
            Tour Management
          </Link>
        </nav>
      </aside>

      <main
        style={{
          flex: 1,
          padding: '32px',
          background: '#f8fafc',
        }}
      >
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  )
}
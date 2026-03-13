import { Link, Outlet, useLocation } from 'react-router-dom'
import { ToastContainer } from '@/shared/ui'
import { LogoutButton } from '@/features/auth/ui/LogoutButton'

export function AdminLayout() {
  const location = useLocation()
  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M3 12h7V3H3v9zm11 9h7v-6h-7v6zm0-10h7V3h-7v8zM3 21h7v-7H3v7z"
            fill="currentColor"
          />
        </svg>
      ),
    },
    {
      path: '/pois',
      label: 'POIs Management',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2a6 6 0 00-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 00-6-6zm0 9a3 3 0 110-6 3 3 0 010 6z"
            fill="currentColor"
          />
        </svg>
      ),
    },
    {
      path: '/tours',
      label: 'Tours Management',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 6a2 2 0 012-2h9a2 2 0 012 2v2h3a2 2 0 012 2v7a3 3 0 01-3 3H6a2 2 0 01-2-2V6zm12 4V6H6v12h12a1 1 0 001-1v-6h-3zm-8 2h6v2H8v-2z"
            fill="currentColor"
          />
        </svg>
      ),
    },
  ]

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <div className="app-logo">VK</div>
          <div>
            <p className="app-brand-title">Vinh Khánh GPS</p>
            <p className="app-brand-subtitle">Admin Dashboard</p>
          </div>
        </div>

        <nav className="app-sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`app-sidebar-link ${
                location.pathname === item.path ? 'active' : ''
              }`}
            >
              <span className="app-sidebar-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <div className="app-user-card">
            <div className="app-user-avatar">A</div>
            <div>
              <p className="app-user-name">Admin</p>
              <p className="app-user-role">Content Manager</p>
            </div>
          </div>
          <LogoutButton className="app-logout-button" label="Logout" />
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  )
}

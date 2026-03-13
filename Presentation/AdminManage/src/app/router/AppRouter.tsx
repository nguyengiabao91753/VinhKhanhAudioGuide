import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages'
import { DashboardPage } from '@/pages/dashboard'
import { PoiManagementPage } from '@/pages/poi-management'
import { TourManagementPage } from '@/pages/tour-management'
import { AdminLayout } from '@/widgets/admin-layout'
import { ProtectedRoute } from '@/features/auth/ui/ProtectedRoute'

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pois" element={<PoiManagementPage />} />
        <Route path="/tours" element={<TourManagementPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

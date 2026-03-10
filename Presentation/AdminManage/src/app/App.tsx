import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/widgets/admin-layout'
import { PoiManagementPage } from '@/pages/poi-management'
import { TourManagementPage } from '@/pages/tour-management'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/pois" replace />} />
          <Route path="/pois" element={<PoiManagementPage />} />
          <Route path="/tours" element={<TourManagementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
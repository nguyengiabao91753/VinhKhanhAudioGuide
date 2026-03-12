import '../index.css';
import { AuthProvider } from './providers/AuthProvider';
import { AppRouter } from './router/AppRouter';

// The original landing UI for the app is preserved below as a reference
// in case we want to restore the pre-routing welcome screen.
//
// export const App = () => {
//   return (
//     <div style={{ padding: '2rem', textAlign: 'center' }}>
//       <h1>Welcome to FSD Architecture</h1>
//       <p>Admin Management System</p>
//       {/* Add your routes and pages here */}
//     </div>
//   );
// };
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/widgets/admin-layout'
import { PoiManagementPage } from '@/pages/poi-management'
import { TourManagementPage } from '@/pages/tour-management'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
};
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/pois" replace />} />
          <Route path="/pois" element={<PoiManagementPage />} />
          <Route path="/tours" element={<TourManagementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  

export default App
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages';
import { DashboardPage, PoisPage, ToursPage } from '@/pages';
import { ProtectedRoute } from '@/features/auth/ui/ProtectedRoute';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pois"
        element={
          <ProtectedRoute>
            <PoisPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tours"
        element={
          <ProtectedRoute>
            <ToursPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

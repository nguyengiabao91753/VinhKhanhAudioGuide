import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { LoadingSpinner } from '@/shared/ui';

type ProtectedRouteProps = {
  children: ReactNode;
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
    return <>{children}</>;
  }

  if (initializing) {
    return (
      <div className="app-page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

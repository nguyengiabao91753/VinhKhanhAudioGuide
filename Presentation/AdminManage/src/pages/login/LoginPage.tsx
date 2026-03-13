import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { LoadingSpinner } from "@/shared/ui";
import "./../../index.css";

export const LoginPage = () => {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();
  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname || "/pois";

  if (import.meta.env.VITE_DISABLE_AUTH === "true") {
    return <Navigate to="/dashboard" replace />;
  }

  if (initializing) {
    return (
      <div
        className="app-page"
        style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-panel-content">
          <div className="auth-logo">VK</div>
          <h1>Vinh Khánh GPS</h1>
          <p>Quản lý hành trình ẩm thực đường phố Vĩnh Khánh.</p>
          <ul>
            <li>Quản lý POIs trực quan trên bản đồ Mapbox</li>
            <li>Thiết kế và sắp xếp Tour theo lộ trình</li>
            <li>Theo dõi số liệu tổng quan hệ thống</li>
          </ul>
        </div>
      </div>
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon">VK</div>
          <h2>Vinh Khánh GPS</h2>
          <p>Quản lý hệ thống ẩm thực đường phố</p>
        </div>
        <LoginForm redirectPath={redirectPath} />
      </div>
    </div>
  );
};

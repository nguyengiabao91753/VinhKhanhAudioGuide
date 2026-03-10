import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { LoginForm } from '@/features/auth/ui/LoginForm';

export const LoginPage = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ maxWidth: 420, margin: '5rem auto', textAlign: 'center' }}>
      <h1>Admin Login</h1>
      <p>Please use your admin credentials to sign in.</p>
      <LoginForm />
    </div>
  );
};

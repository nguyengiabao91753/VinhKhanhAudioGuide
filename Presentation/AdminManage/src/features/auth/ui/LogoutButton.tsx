import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';

export const LogoutButton = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <button type="button" onClick={handleLogout} style={{ padding: '8px 14px' }}>
      Logout
    </button>
  );
};

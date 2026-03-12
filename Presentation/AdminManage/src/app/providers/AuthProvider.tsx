/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { loginRequest } from '@/features/auth/api/loginRequest';
import type { AuthUser, LoginCredentials } from '@/features/auth/model/auth.types';
import { clearStoredAuthUser, getStoredAuthUser, setStoredAuthUser, isTokenExpired } from '@/features/auth/model/authStorage';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth from storage on mount
  useEffect(() => {
    try {
      const auth = getStoredAuthUser();
      if (auth && !isTokenExpired()) {
        setUser(auth);
      } else if (auth) {
        // Token expired or doesn't have expiresAt
        clearStoredAuthUser();
      }
    } catch {
      clearStoredAuthUser();
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await loginRequest(credentials);
      const authenticatedUser: AuthUser = {
        id: response.user.id,
        username: response.user.username,
        email: response.user.email,
        token: response.token,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt,
      };
      setUser(authenticatedUser);
      setStoredAuthUser(authenticatedUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    clearStoredAuthUser();
  };

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, logout, isLoading, error }),
    [user, isLoading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

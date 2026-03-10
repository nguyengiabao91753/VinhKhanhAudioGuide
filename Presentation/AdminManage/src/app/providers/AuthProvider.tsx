/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react';
import { loginRequest } from '@/features/auth/api/loginRequest';
import type { AuthUser, LoginCredentials } from '@/features/auth/model/auth.types';
import { clearStoredAuthUser, getStoredAuthUser, setStoredAuthUser } from '@/features/auth/model/authStorage';

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser());

  const login = async (credentials: LoginCredentials) => {
    const isValid = await loginRequest(credentials);
    if (!isValid) return false;

    const authenticatedUser: AuthUser = { username: credentials.username };
    setUser(authenticatedUser);
    setStoredAuthUser(authenticatedUser);

    return true;
  };

  const logout = () => {
    setUser(null);
    clearStoredAuthUser();
  };

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, logout }),
    [user],
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

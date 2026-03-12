import type { AuthUser } from './auth.types';

const STORAGE_KEY = 'admin_auth';

export const getStoredAuthUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const setStoredAuthUser = (user: AuthUser) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const clearStoredAuthUser = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const isTokenExpired = (): boolean => {
  const auth = getStoredAuthUser();
  if (!auth?.expiresAt) return false;
  return Date.now() > auth.expiresAt;
};

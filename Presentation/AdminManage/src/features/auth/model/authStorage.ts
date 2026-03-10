import type { AuthUser } from './auth.types';

const STORAGE_KEY = 'admin_user';

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

import type { AuthUser } from './auth.types';

// Keep storage key consistent across app and PRD (vk_auth_user).
export const AUTH_STORAGE_KEY = 'vk_auth_user';

export const getStoredAuthUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const setStoredAuthUser = (user: AuthUser) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

export const clearStoredAuthUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const isTokenExpired = (): boolean => {
  const auth = getStoredAuthUser();
  if (!auth?.expiresAt) return false;
  return Date.now() > auth.expiresAt;
};

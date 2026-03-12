import { apiFetch } from '@/shared/api/http';
import type { LoginCredentials, LoginResponse } from '../model/auth.types';

/**
 * Login request that calls the real backend API
 * Exchanges email/password for JWT token
 */
export const loginRequest = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

import type { LoginCredentials } from '../model/auth.types';

const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin2026';

/**
 * Fake login request that validates hardcoded credentials.
 * Mimics async API call for demo purposes.
 */
export const loginRequest = async (credentials: LoginCredentials): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return (
    credentials.username === VALID_USERNAME && credentials.password === VALID_PASSWORD
  );
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  token: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  expiresAt?: number;
};

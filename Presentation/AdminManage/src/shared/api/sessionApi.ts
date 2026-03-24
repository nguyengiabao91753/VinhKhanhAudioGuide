import { apiFetch } from "./http";

export type ActiveSession = {
  sessionId: string;
  lang: string;
  currentPoiId: string | null;
  tourId: string | null;
  lat: number | null;
  lng: number | null;
  device: string;
  firstSeen: string;
  lastSeen: string;
  onlineSeconds: number;
};

export type ActiveUsersResponse = {
  total: number;
  sessions: ActiveSession[];
};

export function getActiveUsers() {
  return apiFetch<ActiveUsersResponse>("/admin/active-users");
}
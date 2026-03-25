const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:5111/api";

const SESSION_KEY = "vk_session_id";

export function getOrCreateSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

type PingPayload = {
  lang?: string;
  currentPoiId?: string | null;
  tourId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export async function sendSessionPing(payload: PingPayload = {}) {
  const sessionId = getOrCreateSessionId();

  const body = {
    sessionId,
    lang: payload.lang ?? "vi",
    currentPoiId: payload.currentPoiId ?? null,
    tourId: payload.tourId ?? null,
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    userAgent: navigator.userAgent,
  };

  const res = await fetch(`${API_BASE_URL}/session/ping`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Ping failed: ${res.status}`);
  }

  return res.json();
}
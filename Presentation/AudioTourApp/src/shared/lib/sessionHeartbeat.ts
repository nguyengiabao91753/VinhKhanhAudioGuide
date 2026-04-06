const API_BASE_URL =
  import.meta.env.VITE_API_ENDPOINT || "http://localhost:5111/api";

const SESSION_KEY = "vk_session_id";
const DEVICE_INSTANCE_KEY = "vk_device_instance_id";

export function getOrCreateSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

export function getOrCreateDeviceInstanceId() {
  let deviceInstanceId = localStorage.getItem(DEVICE_INSTANCE_KEY);

  if (!deviceInstanceId) {
    deviceInstanceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_INSTANCE_KEY, deviceInstanceId);
  }

  return deviceInstanceId;
}

function detectBrowserName(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (ua.includes("edg")) return "Edge";
  if (ua.includes("opr") || ua.includes("opera")) return "Opera";
  if (ua.includes("chrome") && !ua.includes("edg")) return "Chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("firefox")) return "Firefox";

  return "Unknown";
}

function detectOsName(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "iOS";
  }

  if (ua.includes("android")) return "Android";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("linux")) return "Linux";

  return "Unknown";
}

function detectDeviceType(userAgent: string): "mobile" | "desktop" {
  const ua = userAgent.toLowerCase();

  if (
    ua.includes("mobile") ||
    ua.includes("android") ||
    ua.includes("iphone") ||
    ua.includes("ipad")
  ) {
    return "mobile";
  }

  return "desktop";
}

function buildDeviceDisplayName(
  userAgent: string,
  browserName: string,
  deviceType: "mobile" | "desktop",
  deviceModel?: string | null
) {
  const ua = userAgent.toLowerCase();

  if (deviceModel && deviceModel.trim()) {
    return `${deviceModel} · ${browserName}`;
  }

  if (ua.includes("iphone")) return `iPhone · ${browserName}`;
  if (ua.includes("ipad")) return `iPad · ${browserName}`;
  if (ua.includes("android")) return `Android · ${browserName}`;
  if (ua.includes("windows")) return `Windows PC · ${browserName}`;
  if (ua.includes("mac os") || ua.includes("macintosh")) return `Mac · ${browserName}`;
  if (ua.includes("linux")) return `Linux PC · ${browserName}`;

  return deviceType === "mobile"
    ? `Mobile · ${browserName}`
    : `Desktop · ${browserName}`;
}

async function getDeviceModel() {
  const uaData = (navigator as Navigator & {
    userAgentData?: {
      getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string }>;
    };
  }).userAgentData;

  if (!uaData?.getHighEntropyValues) {
    return null;
  }

  try {
    const result = await uaData.getHighEntropyValues(["model"]);
    return result?.model || null;
  } catch {
    return null;
  }
}

type PingPayload = {
  lang?: string;
  currentPoiId?: string | null;
  currentPoiName?: string | null;
  tourId?: string | null;
  tourName?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export async function sendSessionPing(payload: PingPayload = {}) {
  const sessionId = getOrCreateSessionId();
  const deviceInstanceId = getOrCreateDeviceInstanceId();

  const userAgentRaw = navigator.userAgent;
  const browserName = detectBrowserName(userAgentRaw);
  const osName = detectOsName(userAgentRaw);
  const deviceType = detectDeviceType(userAgentRaw);
  const deviceModel = await getDeviceModel();
  const deviceDisplayName = buildDeviceDisplayName(
    userAgentRaw,
    browserName,
    deviceType,
    deviceModel
  );

  const body = {
    sessionId,
    lang: payload.lang ?? "vi",
    currentPoiId: payload.currentPoiId ?? null,
    currentPoiName: payload.currentPoiName ?? null,
    tourId: payload.tourId ?? null,
    tourName: payload.tourName ?? null,
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,

    userAgent: userAgentRaw,
    userAgentRaw,

    deviceInstanceId,
    deviceDisplayName,
    deviceType,
    deviceModel,
    browserName,
    osName,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh",
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
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
const DEFAULT_API_ENDPOINT = 'https://localhost:7047/api';
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || DEFAULT_API_ENDPOINT;

function buildUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_ENDPOINT}${normalized}`;
}

export async function apiGet<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 5000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(buildUrl(path), {
      ...init,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { API_ENDPOINT };

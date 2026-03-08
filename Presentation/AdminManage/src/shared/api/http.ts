const API_BASE_URL = 'http://localhost:5111/api'

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  })

  const responseData = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(responseData?.error?.message || 'Request failed')
  }

  return responseData as T
}
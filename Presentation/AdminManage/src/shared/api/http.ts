const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:5111/api'

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Get auth token from localStorage
  let authToken: string | null = null
  try {
    const authData = localStorage.getItem('admin_auth')
    if (authData) {
      const parsed = JSON.parse(authData)
      authToken = parsed.token
    }
  } catch {
    // Ignore parsing errors
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(typeof options?.headers === 'object' ? options.headers : {}),
  }

  // Inject JWT token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const responseData = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(responseData?.error?.message || `HTTP ${response.status}: Request failed`)
  }

  return responseData as T
}
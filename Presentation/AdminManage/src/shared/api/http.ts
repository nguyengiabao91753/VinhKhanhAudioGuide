const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || 'https://localhost:7047/api'
const AUTH_STORAGE_KEY = 'vk_auth_user'

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Get auth token from localStorage
  let authToken: string | null = null
  try {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY)
    if (authData) {
      const parsed = JSON.parse(authData)
      authToken = parsed.token
    }
  } catch {
    // Ignore parsing errors
  }

  const isFormData =
    typeof FormData !== 'undefined' && options?.body instanceof FormData
  const headers = new Headers(options?.headers)

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Inject JWT token if available
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
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

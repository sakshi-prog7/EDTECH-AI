/**
 * Frontend client for the EDTECH AI API backend.
 *
 * - Base URL from `VITE_API_URL` (default `http://127.0.0.1:8000`).
 * - Access token is stored in localStorage; a 401 triggers one silent refresh
 *   (rotating the refresh token) and a single retry of the original request.
 * - Never stores secrets in code; tokens are only sent via the Authorization
 *   header. The backend re-verifies the user + role on every request.
 */

export const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://127.0.0.1:8000'

const ACCESS_KEY = 'sg_access_token'
const REFRESH_KEY = 'sg_refresh_token'

export interface ApiUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'COUNSELOR' | 'ADMISSIONS' | 'STUDENT'
  is_active: number
  created_at: string
}

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}
export function storeTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  code?: string
}

let refreshing: Promise<boolean> | null = null

async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      clearTokens()
      window.dispatchEvent(new Event('unauthorized'))
      return false
    }
    const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>
    storeTokens(json.data.accessToken, json.data.refreshToken)
    return true
  } catch {
    clearTokens()
    window.dispatchEvent(new Event('unauthorized'))
    return false
  }
}

/** Core request helper with automatic 401 → refresh → retry. */
export async function apiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null; skipAuth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const { method = 'GET', body, token, skipAuth = false, timeoutMs } = init
  const authToken = token !== undefined ? token : getAccessToken()

  const doFetch = (useToken: string | null): Promise<Response> =>
    fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(useToken ? { Authorization: `Bearer ${useToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

  let response = await doFetch(skipAuth ? null : authToken)

  // One silent token refresh + retry on 401 (unless this was itself a refresh).
  if (response.status === 401 && !skipAuth && !path.includes('/auth/refresh')) {
    if (!refreshing) {
      refreshing = refreshTokens().finally(() => {
        refreshing = null
      })
    }
    const refreshed = await refreshing
    if (refreshed) {
      response = await doFetch(getAccessToken())
    }
  }

  let payload: ApiResponse<T> | null = null
  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new ApiError(payload?.message ?? `Request failed (HTTP ${response.status}).`, response.status)
  }
  return payload!.data
}

/* ------------------------------ Auth API ------------------------------ */

export interface AuthResponse {
  user: ApiUser
  accessToken: string
  refreshToken: string
}

export function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  })
}

export function registerRequest(name: string, email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
    skipAuth: true,
  })
}

export function meRequest(): Promise<{ user: ApiUser }> {
  return apiRequest<{ user: ApiUser }>('/api/auth/me')
}

export async function logoutRequest(): Promise<void> {
  const refreshToken = getRefreshToken()
  clearTokens()
  if (!refreshToken) return
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    // Best effort — local session is already cleared.
  }
}

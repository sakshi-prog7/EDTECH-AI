/**
 * Authentication state for the whole app.
 *
 * Bootstraps the session on mount: if a stored access token exists it is
 * validated against `/api/auth/me` (with one silent refresh attempt when it
 * expired). All dashboard routes are wrapped in `<RequireAuth>`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  clearTokens,
  getAccessToken,
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
  storeTokens,
} from '@/services/authApi'
import type { ApiUser } from '@/services/authApi'

interface AuthContextValue {
  user: ApiUser | null
  /** True while the initial session check is still running. */
  initializing: boolean
  /** True when the backend could not be reached during bootstrap. */
  offline: boolean
  login: (email: string, password: string) => Promise<ApiUser>
  register: (name: string, email: string, password: string) => Promise<ApiUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      if (!getAccessToken()) {
        if (!cancelled) setInitializing(false)
        return
      }
      try {
        const { user: current } = await meRequest()
        if (!cancelled) {
          setUser(current)
          setOffline(false)
        }
      } catch (err) {
        if (!cancelled) {
          // Token refresh was attempted inside the client — a persistent
          // failure means the session is gone or the backend is down.
          if (err instanceof Error && /network|fetch|ECONNREFUSED|Failed to fetch/i.test(err.message)) {
            setOffline(true)
          }
          clearTokens()
          setUser(null)
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null)
    }
    window.addEventListener('unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password)
    storeTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    setOffline(false)
    return data.user
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await registerRequest(name, email, password)
    storeTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    setOffline(false)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, initializing, offline, login, register, logout }),
    [user, initializing, offline, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

import { Loader2 } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'

/** Full-screen loading state while the session is being checked. */
function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-500">Checking your session…</p>
      </div>
    </div>
  )
}

/**
 * Wraps authenticated routes. Unauthenticated visitors are redirected to
 * `/login` (remembering where they came from so we can send them back).
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <SessionLoading />
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

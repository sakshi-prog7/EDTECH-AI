import { Loader2 } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import type { ApiUser } from '@/services/authApi'

/** Full-screen loading state while the session is being checked. */
function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-500">Checking permissions…</p>
      </div>
    </div>
  )
}

/**
 * Wraps routes that require specific roles.
 * Unauthenticated users are redirected to `/login`.
 * Authenticated users without the required role see a 403-style message.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: Array<ApiUser['role']>
  children: React.ReactNode
}) {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <SessionLoading />

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 dark:border-rose-400/25 dark:bg-rose-500/[0.07]">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            You do not have permission to view this page.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            Required role: {roles.join(' or ')} · Your role: {user.role}
          </p>
          <a
            href="/dashboard"
            className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

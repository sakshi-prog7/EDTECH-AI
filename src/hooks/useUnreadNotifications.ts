import { useCallback, useEffect, useState } from 'react'

import { listNotifications } from '@/services/crmApi'

/**
 * Live unread notification count for the topbar bell.
 * Refetches whenever `refresh` is called and polls quietly on a long
 * interval while the app is open. Errors simply hide the badge — the
 * Notifications page still shows the full feed with its own error state.
 */
export function useUnreadNotifications(): { unread: number; refresh: () => void } {
  const [unread, setUnread] = useState(0)
  const [attempt, setAttempt] = useState(0)

  const refresh = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    listNotifications()
      .then((data) => {
        if (!cancelled) setUnread(data.unread)
      })
      .catch(() => {
        // Backend unreachable — keep the badge hidden rather than showing a
        // misleading count.
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  useEffect(() => {
    const id = window.setInterval(() => setAttempt((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  return { unread, refresh }
}

import { useCallback, useEffect, useState } from 'react'

import { checkAiService, getAiApiBaseUrl } from '@/services/apiClient'
import type { AiServiceStatus } from '@/types/ai'

interface AiServiceState {
  status: AiServiceStatus
  /** Human-readable detail for the unavailable state ("" when unknown). */
  detail: string
  baseUrl: string
  retry: () => void
}

/**
 * Pings the Member 2 AI service once on mount (and on retry). Consumers gate
 * every AI call on `status === 'connected'` — the UI never pretends the models
 * are reachable when the backend is down or not configured.
 */
export function useAiService(): AiServiceState {
  const [status, setStatus] = useState<AiServiceStatus>('checking')
  const [detail, setDetail] = useState('')
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setStatus('checking')
    setDetail('')
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    checkAiService()
      .then((health) => {
        if (!cancelled) {
          setStatus(health.status === 'ok' ? 'connected' : 'unavailable')
          setDetail(health.status === 'ok' ? '' : 'The AI service reported a non-OK status.')
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatus('unavailable')
          setDetail(err instanceof Error ? err.message : 'AI service is currently unavailable.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return { status, detail, baseUrl: getAiApiBaseUrl(), retry }
}

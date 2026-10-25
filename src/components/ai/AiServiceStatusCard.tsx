import { Loader2, PlugZap, WifiOff } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { cn } from '@/utils/cn'
import type { AiServiceStatus } from '@/types/ai'

interface AiServiceStatusCardProps {
  status: AiServiceStatus
  detail?: string
  baseUrl?: string
  onRetry?: () => void
  className?: string
}

/**
 * Honest AI-service connection banner. Shows while the health check runs,
 * confirms when the backend responds, and — when the backend is down — shows
 * "AI service is currently unavailable" with a Retry button. It never
 * fabricates model results.
 */
export function AiServiceStatusCard({
  status,
  detail,
  baseUrl,
  onRetry,
  className,
}: AiServiceStatusCardProps) {
  const checking = status === 'checking'
  const connected = status === 'connected'

  return (
    <Card
      className={cn(
        'flex flex-col gap-3 border sm:flex-row sm:items-start',
        connected
          ? 'border-emerald-400/25 bg-emerald-50/60 dark:bg-emerald-500/[0.06]'
          : 'border-amber-400/25 bg-amber-50/60 dark:bg-amber-500/[0.06]',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          connected
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
        )}
      >
        {checking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : connected ? (
          <PlugZap className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
          {checking
            ? 'Checking AI service…'
            : connected
              ? 'AI service connected'
              : 'AI service is currently unavailable'}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400">
          {checking
            ? `Connecting to the prediction API${baseUrl ? ` at ${baseUrl}` : ''}…`
            : connected
              ? 'The prediction API is reachable. Model results below come from the live service.'
              : (detail || 'The prediction API did not respond. Start the backend (Member 2 API) and retry.')}
        </p>
      </div>

      {!checking && !connected && onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="shrink-0 self-start">
          Retry
        </Button>
      )}
    </Card>
  )
}

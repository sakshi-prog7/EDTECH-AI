import { CircleAlert, RefreshCw } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
        <CircleAlert className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {message ?? 'We could not load this data. Please try again.'}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </Card>
  )
}

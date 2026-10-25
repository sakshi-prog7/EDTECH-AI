import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'

import { cn } from '@/utils/cn'

export type ToastKind = 'success' | 'error'

export interface ToastState {
  kind: ToastKind
  message: string
}

interface ToastProps {
  toast: ToastState | null
  onDismiss: () => void
}

/**
 * Small transient feedback toast (bottom-right, light/dark aware).
 * Auto-dismisses after 3.5s; Escape or the close button dismisses it sooner.
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!toast) {
      setVisible(false)
      return
    }
    // Re-trigger the entrance animation for each new toast.
    const raf = requestAnimationFrame(() => setVisible(true))
    const timer = window.setTimeout(onDismiss, 3500)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [toast, onDismiss])

  if (!toast) return null

  const Icon = toast.kind === 'success' ? CheckCircle2 : CircleAlert

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6 sm:justify-end"
    >
      <div
        className={cn(
          'pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-md transition-all duration-200',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          toast.kind === 'success'
            ? 'border-emerald-300/60 bg-white/95 text-slate-800 dark:border-emerald-400/30 dark:bg-navy-900/95 dark:text-slate-100'
            : 'border-rose-300/60 bg-white/95 text-slate-800 dark:border-rose-400/30 dark:bg-navy-900/95 dark:text-slate-100',
        )}
      >
        <Icon
          className={cn(
            'h-4.5 w-4.5 shrink-0',
            toast.kind === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
          )}
        />
        <p className="text-[13px] font-medium leading-snug">{toast.message}</p>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
          className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

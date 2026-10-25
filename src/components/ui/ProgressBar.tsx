import { cn } from '@/utils/cn'

interface ProgressBarProps {
  /** 0–100 */
  value: number
  label?: string
  /** Tailwind bg color for the fill, e.g. `bg-indigo-500`. */
  barClass?: string
  className?: string
}

export function ProgressBar({ value, label, barClass = 'bg-indigo-500', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">{label}</span>
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {clamped}%
          </span>
        </div>
      )}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-all', barClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

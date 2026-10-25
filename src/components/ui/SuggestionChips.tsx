/**
 * Suggestion chips — contextual quick actions that appear based on
 * current data state. Each chip is a clickable button that navigates
 * to the relevant page or opens an action.
 */
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SuggestionChip {
  id: string
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'warning'
  badge?: string | number
}

interface SuggestionChipsProps {
  chips: SuggestionChip[]
  className?: string
}

const VARIANT_STYLES: Record<string, string> = {
  primary: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/15',
  secondary: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15',
}

export function SuggestionChips({ chips, className }: SuggestionChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group" aria-label="Suggested actions">
      {chips.map((chip) => {
        const Icon = chip.icon
        const variant = chip.variant ?? 'secondary'
        return (
          <button
            key={chip.id}
            type="button"
            onClick={chip.onClick}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
              VARIANT_STYLES[variant],
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {chip.label}
            {chip.badge !== undefined && (
              <span className="ml-0.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {chip.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

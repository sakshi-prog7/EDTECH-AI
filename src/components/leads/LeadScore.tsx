import { Zap } from 'lucide-react'

import { cn } from '@/utils/cn'

export type LeadIntent = 'High' | 'Medium' | 'Low'

/** Derive an intent level from the existing AI lead score (0–100). */
export function getIntent(score: number): LeadIntent {
  if (score >= 80) return 'High'
  if (score >= 60) return 'Medium'
  return 'Low'
}

/** Next-best-action guidance derived from the existing AI score (presentation only). */
export function nextBestAction(score: number): { icon: typeof Zap; text: string } {
  const intent = getIntent(score)
  if (intent === 'High') return { icon: Zap, text: 'High intent — follow up within 24 hours.' }
  if (intent === 'Medium') return { icon: Zap, text: 'Good potential — nurture with course-aligned content.' }
  return { icon: Zap, text: 'Low engagement — monitor before reaching out.' }
}

const intentStyles: Record<LeadIntent, { badge: string; badgeOnDark: string; dot: string; dotOnDark: string }> = {
  High: {
    badge: 'border-indigo-400/25 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-500/10 dark:text-indigo-200 dark:shadow-[0_0_12px_rgba(124,92,255,0.2)]',
    badgeOnDark: 'border-indigo-400/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 shadow-[0_0_12px_rgba(124,92,255,0.2)]',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
    dotOnDark: 'bg-indigo-400',
  },
  Medium: {
    badge: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
    badgeOnDark: 'border-white/10 bg-white/5 text-slate-300',
    dot: 'bg-slate-500 dark:bg-slate-400',
    dotOnDark: 'bg-slate-400',
  },
  Low: {
    badge: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-500',
    badgeOnDark: 'border-white/10 bg-white/[0.02] text-slate-400',
    dot: 'bg-slate-600',
    dotOnDark: 'bg-slate-600',
  },
}

/** Compact intent state badge (HIGH / MEDIUM / LOW intent). */
export function IntentBadge({
  score,
  className,
  onDark = false,
}: {
  score: number
  className?: string
  /** True when rendered on an always-dark surface (e.g. a detail drawer). */
  onDark?: boolean
}) {
  const intent = getIntent(score)
  const styles = intentStyles[intent]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        onDark ? styles.badgeOnDark : styles.badge,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', onDark ? styles.dotOnDark : styles.dot)} />
      {intent} Intent
    </span>
  )
}

interface ScoreCellProps {
  score: number
  className?: string
  /** Larger variant for the detail drawer. */
  large?: boolean
  /** True when rendered on an always-dark surface (e.g. a detail drawer). */
  onDark?: boolean
}

/** AI lead score with a thin glowing progress indicator. */
export function ScoreCell({ score, className, large = false, onDark = false }: ScoreCellProps) {
  return (
    <div className={cn(large ? 'w-28' : 'w-[72px]', className)}>
      <p
        className={cn(
          'font-bold tabular-nums',
          onDark ? 'text-white' : 'text-slate-900 dark:text-white',
          large ? 'text-3xl leading-none' : 'text-[15px]',
        )}
      >
        {score}
        <span className={cn('font-medium text-slate-500 dark:text-slate-400', large ? 'ml-1 text-sm' : 'ml-0.5 text-[10px]')}>
          / 100
        </span>
      </p>
      <div
        className={cn(
          'overflow-hidden rounded-full',
          onDark ? 'bg-slate-200 dark:bg-white/10' : 'bg-slate-200 dark:bg-white/10',
          large ? 'mt-2 h-1.5' : 'mt-1 h-1',
        )}
        role="img"
        aria-label={`AI lead score ${score} out of 100`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400 shadow-[0_0_8px_rgba(124,92,255,0.55)]"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

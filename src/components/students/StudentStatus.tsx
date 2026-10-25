import { cn } from '@/utils/cn'
import type { RecentLeadStatus } from '@/types/dashboard'

/**
 * One-to-one presentation mapping from the existing pipeline status to a
 * student-lifecycle label. No data is invented — the underlying status value
 * is preserved; only its display label changes.
 */
export const STUDENT_STATUS_LABEL: Record<RecentLeadStatus, string> = {
  New: 'New',
  Contacted: 'Engaged',
  Qualified: 'Active',
  'Follow-up': 'Follow-up',
  Converted: 'Enrolled',
}

const statusStyles: Record<RecentLeadStatus, string> = {
  New: 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400',
  Contacted: 'border-indigo-400/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200',
  Qualified: 'border-indigo-400/30 bg-indigo-500/15 text-indigo-100 shadow-[0_0_12px_rgba(124,92,255,0.2)]',
  'Follow-up': 'border-amber-400/25 bg-amber-500/10 text-amber-200',
  Converted: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
}

const statusDots: Record<RecentLeadStatus, string> = {
  New: 'bg-slate-400',
  Contacted: 'bg-indigo-300',
  Qualified: 'bg-indigo-300',
  'Follow-up': 'bg-amber-300',
  Converted: 'bg-emerald-300',
}

export function StudentStatusBadge({ status, className }: { status: RecentLeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        statusStyles[status],
        className,
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', statusDots[status])} />
      {STUDENT_STATUS_LABEL[status]}
    </span>
  )
}

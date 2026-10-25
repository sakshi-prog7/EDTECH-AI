/**
 * Activity timeline — displays a chronological list of actions/changes
 * for a record (lead, student, enrollment, etc.).
 */
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface TimelineItem {
  id: string
  icon?: ReactNode
  title: string
  description?: string
  time: string
  color?: 'violet' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate'
}

const COLOR_MAP: Record<string, { bg: string; dot: string }> = {
  violet: { bg: 'bg-violet-50 dark:bg-violet-500/10', dot: 'bg-violet-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', dot: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-500/10', dot: 'bg-rose-500' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-500/10', dot: 'bg-sky-500' },
  slate: { bg: 'bg-slate-50 dark:bg-white/5', dot: 'bg-slate-400' },
}

interface ActivityTimelineProps {
  items: TimelineItem[]
  emptyMessage?: string
}

export function ActivityTimeline({ items, emptyMessage = 'No activity recorded yet.' }: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-white/10">
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10" />

      <ul className="space-y-4">
        {items.map((item) => {
          const colors = COLOR_MAP[item.color ?? 'violet']
          return (
            <li key={item.id} className="relative flex gap-3 pl-0">
              <span className={cn('relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-white dark:border-slate-900', colors.bg)}>
                {item.icon ?? <span className={cn('h-2 w-2 rounded-full', colors.dot)} />}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">{item.description}</p>
                )}
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{item.time}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

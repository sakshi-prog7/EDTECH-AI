import { useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'

import type { DashboardRange } from '@/types/datasets'

const DATE_RANGES: Array<{ value: DashboardRange; label: string }> = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
]

interface DateRangeSelectProps {
  /** Controlled value — when provided the select follows the parent's state. */
  value?: DashboardRange
  onChange?: (range: DashboardRange) => void
}

/**
 * Shared date-range filter control (top bar + dashboard header).
 *
 * Uncontrolled by default (Topbar, LeadsPage). The dashboard passes
 * `value` + `onChange` so the selected range drives KPI calculations.
 */
export function DateRangeSelect({ value, onChange }: DateRangeSelectProps) {
  const [internal, setInternal] = useState<DashboardRange>('30d')
  const selected = value ?? internal

  const handleChange = (next: DashboardRange) => {
    if (onChange) onChange(next)
    else setInternal(next)
  }

  return (
    <div className="relative">
      <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
      <select
        aria-label="Date range"
        value={selected}
        onChange={(e) => handleChange(e.target.value as DashboardRange)}
        className="h-9 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white pl-8 pr-7 text-[13px] font-medium text-slate-800 shadow-xs outline-none transition-colors hover:border-indigo-400 hover:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:border-indigo-400/50"
      >
        {DATE_RANGES.map((range) => (
          <option key={range.value} value={range.value} className="bg-white text-slate-800 dark:bg-navy-900 dark:text-slate-200">
            {range.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
    </div>
  )
}

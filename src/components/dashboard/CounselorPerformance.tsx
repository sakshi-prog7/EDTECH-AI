import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Card } from '@/components/common/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { CounselorStat, PerformanceLevel } from '@/types/dashboard'

const performanceVariants: Record<PerformanceLevel, BadgeVariant> = {
  Excellent: 'success',
  Good: 'info',
  Average: 'warning',
}

export function CounselorPerformance({ counselors }: { counselors: CounselorStat[] }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            Counselor Performance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ranked by conversion rate</p>
        </div>
        <Link
          to="/counselors"
          className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          View team
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {counselors.map((counselor) => (
          <div
            key={counselor.id}
            className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:border-slate-200 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                {counselor.rank}
              </span>
              <Avatar name={counselor.name} size="sm" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                  {counselor.name}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {counselor.leadsAssigned} leads · {counselor.enrollments} enrollments
                </p>
              </div>
              <Badge variant={performanceVariants[counselor.performance]}>
                {counselor.performance}
              </Badge>
            </div>

            <div className="mt-3 space-y-2">
              <ProgressBar label="Contact rate" value={counselor.contactRate} barClass="bg-indigo-500" />
              <ProgressBar label="Conversion" value={counselor.conversionRate} barClass="bg-violet-500" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

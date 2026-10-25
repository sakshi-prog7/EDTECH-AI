import { useCallback } from 'react'
import { CalendarCheck, AlertTriangle, Flame, Target, RefreshCw } from 'lucide-react'

import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Skeleton } from '@/components/common/Skeleton'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getDailyBriefing } from '@/services/crmApi'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'

export function DailyBriefingSection() {
  const navigate = useNavigate()
  const fetcher = useCallback(() => getDailyBriefing(), [])
  const { data, loading, error, retry } = useAsyncData(fetcher)

  if (loading) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck className="h-4.5 w-4.5 text-indigo-600" />
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            AI Daily Briefing
          </h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck className="h-4.5 w-4.5 text-indigo-600" />
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            AI Daily Briefing
          </h2>
        </div>
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Could not load briefing. {error && <span className="text-rose-500">{error}</span>}
        </p>
        <Button variant="ghost" size="sm" onClick={retry} className="mt-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </Card>
    )
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/30">
            <CalendarCheck className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
              AI Daily Briefing
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {data.greeting} — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={retry}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <BriefingStat
          icon={Flame}
          label="High Priority"
          value={data.priority_followups}
          accent="amber"
        />
        <BriefingStat
          icon={AlertTriangle}
          label="At-Risk Students"
          value={data.at_risk_students}
          accent="rose"
        />
        <BriefingStat
          icon={Target}
          label="Hot Leads"
          value={data.high_value_leads}
          accent="indigo"
        />
      </div>

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.highlights.map((highlight, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-700 dark:bg-white/[0.03] dark:text-slate-300"
            >
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              {highlight}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {data.actions.length > 0 && (
        <div className="space-y-1.5">
          {data.actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigate(action.route)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-200',
                'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700',
                'dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300',
              )}
            >
              <span>{action.action}</span>
              <Badge variant={action.priority === 'high' ? 'danger' : 'info'}>
                {action.priority}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {data.highlights.length === 0 && data.actions.length === 0 && (
        <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center py-2">
          No urgent items today. Great job staying on top of things!
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Trend: {data.enrollment_trend === 'increasing' ? '📈 Enrollment activity trending upward' : data.enrollment_trend === 'decreasing' ? '📉 Enrollment activity is low this week' : '➡️ Enrollment activity is stable'}
        </p>
      </div>
    </Card>
  )
}

function BriefingStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Flame
  label: string
  value: number
  accent: 'amber' | 'rose' | 'indigo'
}) {
  const accentClasses = {
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  }
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 text-center dark:border-white/10 dark:bg-white/[0.03]">
      <span className={cn('mx-auto flex h-8 w-8 items-center justify-center rounded-lg', accentClasses[accent])}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3 } from 'lucide-react'

import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useChartColors } from '@/hooks/useChartColors'
import { cn } from '@/utils/cn'
import type { DashboardRange } from '@/types/datasets'
import type { TrendPoint, TrendRange } from '@/types/dashboard'

const RANGES: Array<{ value: TrendRange; label: string }> = [
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
]

/** Map the global dashboard filter onto the nearest chart window. */
function globalToTrend(range: DashboardRange): TrendRange {
  switch (range) {
    case '7d':
      return '30d'
    case '90d':
      return '90d'
    case 'all':
      return '1y'
    default:
      return '30d'
  }
}

const SERIES = [
  { key: 'leads', label: 'Leads', color: '#7c3aed' },
  { key: 'qualified', label: 'Qualified Leads', color: '#a78bfa' },
  { key: 'enrollments', label: 'Enrollments', color: '#10b981' },
] as const

export function PerformanceChart({
  data,
  globalRange,
}: {
  data: Record<TrendRange, TrendPoint[]>
  /** When set, the chart window follows the dashboard's date filter. */
  globalRange?: DashboardRange
}) {
  const [range, setRange] = useState<TrendRange>('30d')
  const colors = useChartColors()
  const points = data[range]

  useEffect(() => {
    if (globalRange) setRange(globalToTrend(globalRange))
  }, [globalRange])

  return (
    <Card padding={false} className="flex h-full flex-col overflow-hidden">
      <CardImageHeader
        src="/images/analytics-charts.jpg"
        alt="A professional reviewing charts on a laptop monitor"
        label="Performance"
        icon={BarChart3}
      />
      <div className="flex flex-1 flex-col p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            Sales & Enrollment Performance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Leads, qualified leads and enrollments over time
          </p>
        </div>
        <div
          role="group"
          aria-label="Chart range"
          className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-navy-700 dark:bg-navy-850"
        >
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              aria-pressed={range === r.value}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
                range === r.value
                  ? 'bg-white text-indigo-700 shadow-xs dark:border dark:border-indigo-400/30 dark:bg-white/10 dark:text-indigo-200'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {points.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="INSUFFICIENT DATA"
          description="This metric will become available when a dated leads/enrollment series from the connected dataset is available."
          className="min-h-72 flex-1"
        />
      ) : (
        <div className="h-72 min-h-[240px] flex-1" role="img" aria-label="Sales and enrollment performance chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 5, right: 8, bottom: 0, left: -14 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`perf-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: colors.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              dy={6}
            />
            <YAxis
              tick={{ fill: colors.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{
                ...colors.tooltip,
                borderRadius: 10,
                border: `1px solid ${colors.tooltip.border}`,
                fontSize: 12,
                boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
              {SERIES.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#perf-${s.key})`}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      </div>
    </Card>
  )
}

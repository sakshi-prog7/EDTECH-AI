import { BarChart3 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useChartColors } from '@/hooks/useChartColors'
import type { EnrollmentTrendPoint } from '@/types/dashboard'

export function EnrollmentTrends({ data }: { data: EnrollmentTrendPoint[] }) {
  const colors = useChartColors()

  return (
    <Card padding={false} className="flex h-full flex-col overflow-hidden">
      <CardImageHeader
        src="/images/enrollment-celebration.jpg"
        alt="Students celebrating graduation outdoors"
        label="Enrollment"
        icon={BarChart3}
      />
      <div className="flex flex-1 flex-col p-5">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Enrollment Trends</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          New, completed and drop-off enrollments per month
        </p>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="INSUFFICIENT DATA"
          description="This chart will populate when a dated registration/enrollment series from the connected dataset is available."
          className="mt-4 min-h-56 flex-1"
        />
      ) : (
      <div className="mt-4 h-56 min-h-[200px] flex-1" role="img" aria-label="Enrollment trends chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 4, bottom: 0, left: -18 }} barGap={2}>
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
              width={42}
            />
            <Tooltip
              contentStyle={{
                ...colors.tooltip,
                borderRadius: 10,
                border: `1px solid ${colors.tooltip.border}`,
                fontSize: 12,
              }}
              cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
            <Bar dataKey="newEnrollments" name="New" fill="#7c3aed" radius={[3, 3, 0, 0]} barSize={8} />
            <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[3, 3, 0, 0]} barSize={8} />
            <Bar dataKey="dropoffs" name="Drop-offs" fill="#3f3a5c" radius={[3, 3, 0, 0]} barSize={8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}

      <p className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-[12px] leading-relaxed text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-200">
        New enrollments per month, derived from the connected dataset.
      </p>
      </div>
    </Card>
  )
}

import { useCallback, useMemo } from 'react'
import { ArrowDown, ArrowRight, ChevronRight, GraduationCap, TrendingDown } from 'lucide-react'

import { AiStatCard } from '@/components/ai/AiStatCard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { Card } from '@/components/common/Card'
import { DateRangeSelect } from '@/components/common/DateRangeSelect'
import { EnrollmentTable } from '@/components/enrollments/EnrollmentTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { PhotoCardGrid } from '@/components/common/PhotoCardGrid'
import { Skeleton } from '@/components/common/Skeleton'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDateRange } from '@/context/DateRangeContext'
import { getDashboardData } from '@/services/datasetService'
import { cn } from '@/utils/cn'
import type { FunnelStage, Kpi } from '@/types/dashboard'

export function EnrollmentPipelinePage() {
  const { range } = useDateRange()
  const fetcher = useCallback(() => getDashboardData(range), [range])
  const { data, loading, error, retry } = useAsyncData(fetcher)

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Enrollment Pipeline"
        title="Enrollment Pipeline"
        description="From first touch to enrollment, stage by stage."
        actions={<DateRangeSelect />}
      />

      <PageBanner
        src="/images/enrollment-graduation.jpg"
        alt="University graduates celebrating their enrollment milestone in caps and gowns"
        label="Enrollment Journey"
        icon={GraduationCap}
        caption="From first touch to enrolled — every stage of the admissions pipeline, measured and actionable."
      />

      {loading ? (
        <PipelineSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={retry} />
      ) : data.funnel.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No pipeline data available"
          description="There is currently not enough information to display the pipeline."
          className="py-20"
        />
      ) : (
        <>
          <PipelineView stages={data.funnel} kpis={data.kpis} />
          <div className="mt-6">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Enrollment Records</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Live enrollment funnel records — advance leads stage by stage.
            </p>
            <div className="mt-4">
              <EnrollmentTable />
            </div>
          </div>
        </>
      )}

      <div className="mt-8">
        <PhotoCardGrid
          label="The Enrollment Journey"
          items={[
            {
              src: '/images/enrollment-admission.jpg',
              alt: 'University students in academic dress celebrating admission',
              title: 'Admission Day',
              description: 'The moment applications turn into accepted students.',
            },
            {
              src: '/images/enrollment-hallway.jpg',
              alt: 'Graduating students walking down a university hallway',
              title: 'Campus Life',
              description: 'Enrolled students continue their journey beyond the pipeline.',
            },
            {
              src: '/images/enrollment-celebration.jpg',
              alt: 'Students celebrating graduation outdoors',
              title: 'Enrollment Milestones',
              description: 'Celebrate and measure every cohort that completes enrollment.',
            },
          ]}
        />
      </div>
    </>
  )
}

function PipelineView({ stages, kpis }: { stages: FunnelStage[]; kpis: Kpi[] }) {
  const firstCount = stages[0]?.count ?? 1
  const lastCount = stages[stages.length - 1]?.count ?? 0
  const overallConversion = firstCount > 0 ? (lastCount / firstCount) * 100 : 0

  // Biggest relative stage-to-stage drop-off (derived from real conversion values).
  const dropOff = useMemo(() => {
    let worst: { from: string; to: string; drop: number } | null = null
    for (let i = 1; i < stages.length; i++) {
      const prev = stages[i - 1].conversion
      const cur = stages[i].conversion
      if (prev <= 0) continue
      const drop = ((prev - cur) / prev) * 100
      if (!worst || drop > worst.drop) worst = { from: stages[i - 1].name, to: stages[i].name, drop }
    }
    return worst
  }, [stages])

  const totalLeads = kpis.find((k) => k.id === 'total-leads') ?? null
  const qualifiedLeads = kpis.find((k) => k.id === 'qualified-leads') ?? null

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {totalLeads && <KpiCard kpi={totalLeads} />}
        {qualifiedLeads && <KpiCard kpi={qualifiedLeads} />}
        <AiStatCard icon={GraduationCap} label="Enrolled" value={lastCount.toLocaleString()} caption="final pipeline stage" accent="emerald" />
        <AiStatCard icon={TrendingDown} label="Overall Conversion" value={`${overallConversion.toFixed(1)}%`} caption="new lead → enrollment" accent="violet" />
      </div>

      {/* Stage flow */}
      <Card padding={false} className="overflow-hidden">
        <div className="border-b border-slate-200 dark:border-white/10 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Pipeline Stages</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Actual stage counts from the current dataset · conversion vs previous stage
          </p>
        </div>

        <div className="flex flex-col gap-2 p-4 xl:flex-row xl:items-stretch xl:gap-0 xl:p-5">
          {stages.map((stage, index) => {
            const isLast = index === stages.length - 1
            const isFinal = stage.id === 'enrollment'
            return (
              <div key={stage.id} className="flex flex-col xl:flex-1">
                <div
                  className={cn(
                    'relative flex h-full flex-col overflow-hidden rounded-xl border bg-white/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5',
                    isFinal
                      ? 'border-emerald-400/25'
                      : 'border-indigo-400/20 hover:border-indigo-400/40',
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute inset-x-0 top-0 h-0.5',
                      isFinal ? 'bg-emerald-400/70' : 'bg-gradient-to-r from-violet-600 to-purple-400',
                    )}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-[11px] font-bold uppercase tracking-wider',
                        isFinal ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-300',
                      )}
                    >
                      {stage.name}
                    </span>
                    <span className="text-[10px] tabular-nums text-slate-500">{stage.pctOfTotal}% of total</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {stage.count.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {index === 0 ? 'Entry stage' : `${stage.conversion}% of previous stage`}
                  </p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        isFinal ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : 'bg-gradient-to-r from-violet-600 to-purple-400',
                      )}
                      style={{ width: `${(stage.count / firstCount) * 100}%` }}
                    />
                  </div>
                </div>

                {!isLast && (
                  <>
                    <ArrowDown className="mx-auto my-1.5 h-4 w-4 text-slate-500 xl:hidden" />
                    <div className="hidden items-center justify-center px-1 xl:flex">
                      <ChevronRight className="h-4 w-4 text-indigo-400/60" />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-start gap-2.5 border-t border-slate-200 dark:border-white/10 px-5 py-3.5 text-[12px] text-slate-500 dark:text-slate-400">
          <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          {dropOff ? (
            <p>
              Biggest drop-off: <span className="font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-200">{dropOff.from} → {dropOff.to}</span>{' '}
              loses <span className="font-semibold text-amber-600 dark:text-amber-400">{dropOff.drop.toFixed(1)}%</span> of the previous stage.
            </p>
          ) : (
            <p>No stage-to-stage drop-off could be derived.</p>
          )}
        </div>
      </Card>

      {/* Flow legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <ArrowRight className="h-3.5 w-3.5 text-indigo-400/70" />
          Desktop shows the full journey left → right
        </span>
        <span className="flex items-center gap-1.5">
          <ArrowDown className="h-3.5 w-3.5 text-slate-500" />
          Mobile stacks the stages vertically
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Final enrollment stage
        </span>
      </div>
    </div>
  )
}

function PipelineSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading pipeline">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

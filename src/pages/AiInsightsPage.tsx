import { useCallback, useMemo } from 'react'
import { GraduationCap, Lightbulb, Sparkles, UserCheck } from 'lucide-react'

import { AiServiceStatusCard } from '@/components/ai/AiServiceStatusCard'
import { AiSignalCard } from '@/components/ai/AiSignalCard'
import { Card } from '@/components/common/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/common/Skeleton'
import { useAiService } from '@/hooks/useAiService'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getDashboardData } from '@/services/datasetService'
import type { DashboardData, AiInsight } from '@/types/dashboard'

export function AiInsightsPage() {
  const { data, loading, error, retry } = useAsyncData(
    useCallback(() => getDashboardData('all'), []),
  )
  const ai = useAiService()

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Intelligence Signals"
        title="AI Insights"
        description="Turn existing intelligence into actionable signals."
      />

      {loading ? (
        <InsightsSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={retry} />
      ) : data.aiInsights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No AI insights available"
          description="There is currently not enough information to display this insight."
          className="py-20"
        />
      ) : (
        <InsightsView data={data} aiStatus={ai.status} aiDetail={ai.detail} aiBaseUrl={ai.baseUrl} onAiRetry={ai.retry} />
      )}
    </>
  )
}

function InsightsView({
  data,
  aiStatus,
  aiDetail,
  aiBaseUrl,
  onAiRetry,
}: {
  data: DashboardData
  aiStatus: 'checking' | 'connected' | 'unavailable'
  aiDetail: string
  aiBaseUrl: string
  onAiRetry: () => void
}) {
  const { primary, rest } = useMemo(() => {
    const [first, ...others] = data.aiInsights
    return { primary: first ?? null, rest: others }
  }, [data])

  const sections = useMemo(() => groupInsights(rest), [rest])

  const highIntentCount = data.recentLeads.filter((l) => l.score >= 80).length
  const hasRoster = data.recentLeads.length > 0
  const conversionKpi = data.kpis.find((k) => k.id === 'enrollment-conversion')

  // Forecast value parsed from the existing forecast insight message — never hardcoded.
  const forecastValue = useMemo(() => {
    const forecast = data.aiInsights.find((i) => i.id === 'forecast')
    const match = forecast?.message.match(/([\d,]+)\s+enrollments expected next month/)
    return match?.[1] ?? null
  }, [data])

  return (
    <div className="space-y-6">
      {/* Live AI-service status — signals below are dataset-derived, never fabricated */}
      <AiServiceStatusCard status={aiStatus} detail={aiDetail} baseUrl={aiBaseUrl} onRetry={onAiRetry} />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile icon={Sparkles} label="Active AI Signals" value={String(data.aiInsights.length)} caption="signals currently available" accent="violet" />
        <SummaryTile
          icon={UserCheck}
          label="High Intent Leads"
          value={hasRoster ? String(highIntentCount) : '—'}
          caption={
            hasRoster
              ? 'score ≥ 80 in the current roster'
              : 'no person-level lead records in connected dataset'
          }
          accent="violet"
        />
        <SummaryTile icon={GraduationCap} label="Enrollment Forecast" value={forecastValue ?? '—'} caption="expected next month (existing forecast)" accent="emerald" />
        <SummaryTile icon={Sparkles} label="Conversion" value={conversionKpi?.value ?? '—'} caption={conversionKpi ? `${conversionKpi.delta > 0 ? '+' : ''}${conversionKpi.delta}% vs previous period` : 'existing KPI'} accent="emerald" />
      </div>

      {/* Primary insight spotlight */}
      {primary && (
        <Card className="relative overflow-hidden">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/25">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">✦ Primary Signal</p>
              <p className="mt-1 text-[15px] font-semibold text-slate-900 dark:text-white">{primary.title}</p>
              <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                {primary.message}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Signal sections */}
      <div className="space-y-6">
        <Section title="Student Signals" icon={UserCheck} items={sections.students} />
        <Section title="Course Signals" icon={GraduationCap} items={sections.courses} />
        <Section title="Admissions Opportunities" icon={Lightbulb} items={sections.opportunities} />
      </div>
    </div>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  caption,
  accent,
}: {
  icon: typeof Sparkles
  label: string
  value: string
  caption: string
  accent: 'violet' | 'emerald'
}) {
  return (
    <Card className="flex items-start gap-3">
      <span
        className={
          accent === 'emerald'
            ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400'
        }
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-500">{caption}</p>
      </div>
    </Card>
  )
}

function Section({
  title,
  icon: Icon,
  items,
}: {
  title: string
  icon: typeof Sparkles
  items: AiInsight[]
}) {
  if (items.length === 0) return null
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-white">
        <Icon className="h-4 w-4 text-indigo-400" />
        {title}
        <span className="ml-1 rounded-full bg-slate-200 dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
          {items.length}
        </span>
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((insight) => (
          <AiSignalCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  )
}

/** Group existing insight records into presentation sections by title keywords. */
function groupInsights(insights: AiInsight[]) {
  const studentSignal = /student|lead|intent|engagement|at-risk/i
  const courseSignal = /course|program|data science|ai &|business|python/i

  const students = insights.filter((i) => studentSignal.test(`${i.title} ${i.message}`))
  const courses = insights.filter((i) => !students.includes(i) && courseSignal.test(`${i.title} ${i.message}`))
  const opportunities = insights.filter((i) => !students.includes(i) && !courses.includes(i))

  return { students, courses, opportunities }
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading AI insights">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

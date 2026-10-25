import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, GraduationCap, Rocket, Sparkles, TrendingUp, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { AiStatCard } from '@/components/ai/AiStatCard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { PhotoCardGrid } from '@/components/common/PhotoCardGrid'
import { Skeleton } from '@/components/common/Skeleton'
import { getIntent } from '@/components/leads/LeadScore'
import type { LeadIntent } from '@/components/leads/LeadScore'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useChartColors } from '@/hooks/useChartColors'
import { getDashboardData } from '@/services/datasetService'
import { cn } from '@/utils/cn'
import type { DashboardData } from '@/types/dashboard'

const ANALYTICS_TABS = [
  { label: 'Sales Analytics', to: '/analytics/sales' },
  { label: 'Admission Analytics', to: '/analytics/admissions' },
  { label: 'Marketing Analytics', to: '/analytics/marketing' },
]

type IntentFilter = 'All' | 'High' | 'Medium' | 'Low'
const INTENT_FILTERS: IntentFilter[] = ['All', 'High', 'Medium', 'Low']

export function AnalyticsPage() {
  const { data, loading, error, retry } = useAsyncData(
    useCallback(() => getDashboardData('all'), []),
  )

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Analytics"
        title="Analytics"
        description="Admissions and sales performance at a glance."
      />

      <AnalyticsTabs />

      {loading ? (
        <AnalyticsSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={retry} />
      ) : data.courses.length === 0 || data.funnel.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics data available"
          description="There is currently no information to display."
          className="py-20"
        />
      ) : (
        <AnalyticsView data={data} />
      )}
    </>
  )
}

function AnalyticsTabs() {
  return (
    <div className="mb-6 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-xs dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl">
      {ANALYTICS_TABS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }: { isActive: boolean }) =>
            cn(
              'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
              isActive
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}

function AnalyticsView({ data }: { data: DashboardData }) {
  const colors = useChartColors()
  const [intentFilter, setIntentFilter] = useState<IntentFilter>('All')

  // --- KPI values (all derived from the existing dataset) ---
  const totalLeads = data.kpis.find((k) => k.id === 'total-leads') ?? null
  const qualifiedLeads = data.kpis.find((k) => k.id === 'qualified-leads') ?? null
  const conversionKpi = data.kpis.find((k) => k.id === 'enrollment-conversion') ?? null
  const firstStage = data.funnel[0]?.count ?? 0
  const lastStage = data.funnel[data.funnel.length - 1]?.count ?? 0
  const enrolled = lastStage

  // --- Lead sources (from the existing roster) ---
  const filteredLeads = useMemo(() => {
    if (intentFilter === 'All') return data.recentLeads
    return data.recentLeads.filter((l) => getIntent(l.score) === intentFilter)
  }, [data.recentLeads, intentFilter])

  const sourceRows = useMemo(() => {
    const map = new Map<string, { leads: number; qualified: number; scores: number[] }>()
    for (const lead of filteredLeads) {
      const row = map.get(lead.source) ?? { leads: 0, qualified: 0, scores: [] }
      row.leads += 1
      row.scores.push(lead.score)
      if (lead.status === 'Qualified' || lead.status === 'Converted') row.qualified += 1
      map.set(lead.source, row)
    }
    return [...map.entries()]
      .map(([source, row]) => ({
        source,
        leads: row.leads,
        qualified: row.qualified,
        avgScore: row.scores.length ? Math.round(row.scores.reduce((a, b) => a + b, 0) / row.scores.length) : 0,
      }))
      .sort((a, b) => b.leads - a.leads || a.source.localeCompare(b.source))
  }, [filteredLeads])

  // --- Lead score distribution (intent groups from the existing AI thresholds) ---
  const intentDist = useMemo(() => {
    const counts: Record<LeadIntent, number> = { High: 0, Medium: 0, Low: 0 }
    for (const lead of filteredLeads) counts[getIntent(lead.score)] += 1
    const total = filteredLeads.length
    return (['High', 'Medium', 'Low'] as const).map((k) => ({
      name: `${k} Intent`,
      intent: k,
      count: counts[k],
      pct: total > 0 ? Math.round((counts[k] / total) * 100) : 0,
    }))
  }, [filteredLeads])

  const avgScore = useMemo(() => {
    if (filteredLeads.length === 0) return 0
    return Math.round(filteredLeads.reduce((sum, l) => sum + l.score, 0) / filteredLeads.length)
  }, [filteredLeads])

  // --- Key insights (deterministic derivations only) ---
  const insights = useMemo(() => {
    const topCourse = [...data.courses].sort((a, b) => b.enrollments - a.enrollments)[0]
    const overallConversion = firstStage > 0 ? (lastStage / firstStage) * 100 : 0
    const months = data.enrollmentTrends
    const last = months[months.length - 1]
    const prev = months[months.length - 2]
    const momChange =
      last?.completed !== undefined && prev?.completed !== undefined && prev.completed > 0
        ? ((last.completed - prev.completed) / prev.completed) * 100
        : null

    const maxSourceCount = Math.max(...sourceRows.map((r) => r.leads), 0)
    const topSources = sourceRows.filter((r) => r.leads === maxSourceCount).map((r) => r.source)

    return {
      topCourse,
      overallConversion,
      momChange,
      topSources,
    }
  }, [data.courses, data.funnel, data.enrollmentTrends, sourceRows])

  return (
    <div className="space-y-6">
      {/* KPI summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {totalLeads && <KpiCard kpi={totalLeads} />}
        {qualifiedLeads && <KpiCard kpi={qualifiedLeads} />}
        <AiStatCard
          icon={GraduationCap}
          label="Enrolled Students"
          value={enrolled.toLocaleString()}
          caption="funnel · enrollment stage"
          accent="emerald"
        />
        {conversionKpi && <KpiCard kpi={conversionKpi} />}
      </div>

      {/* Pipeline + course performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Lead Status Pipeline" subtitle="From new lead to enrollment">
          <div className="h-72" role="img" aria-label="Lead pipeline chart by stage">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.funnel} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }} barSize={16}>
                <defs>
                  <linearGradient id="pipeline-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fill: colors.tick, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ ...colors.tooltip, borderRadius: 10, border: `1px solid ${colors.tooltip.border}`, fontSize: 12 }}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                />
                <Bar dataKey="count" name="Leads" fill="url(#pipeline-grad)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-[11.5px] text-slate-500 dark:text-slate-400">
            Overall conversion:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-200">
              {insights.overallConversion.toFixed(1)}%
            </span>{' '}
            ({lastStage.toLocaleString()} / {firstStage.toLocaleString()} leads)
          </p>
        </ChartCard>

        <ChartCard title="Course Performance" subtitle="Enrollments per course this cycle">
          <div className="h-72" role="img" aria-label="Course performance chart by enrollments">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.courses} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }} barSize={14}>
                <defs>
                  <linearGradient id="course-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={118}
                  tick={{ fill: colors.tick, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ ...colors.tooltip, borderRadius: 10, border: `1px solid ${colors.tooltip.border}`, fontSize: 12 }}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                />
                <Bar dataKey="enrollments" name="Enrollments" fill="url(#course-grad)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Lead score distribution + intent snapshot */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Lead Score Distribution"
          subtitle="Roster leads by AI intent — click a bar to apply the intent filter"
        >
          {filteredLeads.length === 0 ? (
            <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center dark:border-white/10">
              <p className="max-w-xs text-[12.5px] leading-relaxed text-slate-500">
                No person-level lead records in the connected dataset — campaign-level lead counts are shown in the
                funnel above.
              </p>
            </div>
          ) : (
            <div className="h-56" role="img" aria-label="Lead score distribution chart by AI intent level">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intentDist} margin={{ top: 5, right: 8, bottom: 0, left: -18 }} barSize={44}>
                  <defs>
                    <linearGradient id="intent-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} dy={6} />
                  <YAxis tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ ...colors.tooltip, borderRadius: 10, border: `1px solid ${colors.tooltip.border}`, fontSize: 12 }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  />
                  <Bar
                    dataKey="count"
                    name="Leads"
                    fill="url(#intent-grad)"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(entry) => {
                      const intent = (entry as { payload?: { intent?: IntentFilter } }).payload?.intent
                      if (intent) setIntentFilter(intent)
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <Card padding={false} className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-slate-200 dark:border-white/10 px-5 py-4">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Intent Snapshot</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">AI score groups across the current roster</p>
          </div>
          {filteredLeads.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-5 py-10 text-center">
              <p className="max-w-xs text-[12.5px] leading-relaxed text-slate-500">
                No person-level lead records in the connected dataset — intent groups cannot be derived.
              </p>
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-white/5 px-5">
            {intentDist.map((row) => (
              <li key={row.intent} className="py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{row.name}</span>
                  <span className="text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">{row.count}</span> leads · {row.pct}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      row.intent === 'High'
                        ? 'bg-gradient-to-r from-violet-600 to-purple-400'
                        : row.intent === 'Medium'
                          ? 'bg-slate-400'
                          : 'bg-slate-600',
                    )}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </li>
            ))}
            </ul>
          )}
          <div className="border-t border-slate-200 dark:border-white/10 px-5 py-4">
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
              Average AI score{filteredLeads.length === 0 ? '' : intentFilter !== 'All' ? ` (${intentFilter.toLowerCase()} intent)` : ''}:
              <span className="ml-1 font-semibold text-indigo-700 dark:text-indigo-200">
                {filteredLeads.length === 0 ? '—' : avgScore}
              </span>
              {filteredLeads.length > 0 && '/100'}
            </p>
          </div>
        </Card>
      </div>

      {/* Enrollment trend + lead sources */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Enrollment Trend" subtitle="New and completed enrollments per month" className="lg:col-span-2">
          <div className="h-64" role="img" aria-label="Monthly enrollment trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.enrollmentTrends} margin={{ top: 5, right: 8, bottom: 0, left: -14 }}>
                <defs>
                  <linearGradient id="enroll-new" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="enroll-completed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} dy={6} />
                <YAxis tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
                <Tooltip
                  contentStyle={{ ...colors.tooltip, borderRadius: 10, border: `1px solid ${colors.tooltip.border}`, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="newEnrollments" name="New" stroke="#7c3aed" strokeWidth={2} fill="url(#enroll-new)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} fill="url(#enroll-completed)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <Card padding={false} className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Lead Sources</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">From the current roster</p>
            </div>
          </div>

          {/* Intent filter — filters the roster-derived stats on the client */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-white/10 px-5 py-3">
            {INTENT_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setIntentFilter(f)}
                aria-pressed={intentFilter === f}
                className={cn(
                  'inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
                  intentFilter === f
                    ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 shadow-[0_0_12px_rgba(124,92,255,0.18)]'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-slate-100',
                )}
              >
                {f} Intent
              </button>
            ))}
          </div>

          <ul className="flex-1 divide-y divide-white/5">
            {sourceRows.length === 0 && (
              <li className="px-5 py-10 text-center">
                <p className="mx-auto max-w-xs text-[12.5px] leading-relaxed text-slate-500">
                  No person-level lead records in the connected dataset — sources cannot be derived.
                </p>
              </li>
            )}
            {sourceRows.map((row) => (
              <li key={row.source} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">{row.source}</p>
                  <p className="shrink-0 text-[12px] tabular-nums text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">{row.leads}</span> leads ·{' '}
                    <span className={cn('font-medium', row.qualified > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>
                      {row.qualified} qualified
                    </span>
                  </p>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400"
                      style={{ width: `${row.avgScore}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                    avg {row.avgScore}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Key insights */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          icon={Rocket}
          label="Top Course"
          title={insights.topCourse?.name ?? '—'}
          caption={`${insights.topCourse?.enrollments ?? 0} enrollments · ${insights.topCourse?.conversion ?? 0}% conversion`}
          accent="violet"
        />
        <InsightCard
          icon={TrendingUp}
          label="Pipeline Conversion"
          title={`${insights.overallConversion.toFixed(1)}%`}
          caption={`${lastStage.toLocaleString()} enrolled of ${firstStage.toLocaleString()} leads`}
          accent="emerald"
        />
        <InsightCard
          icon={Sparkles}
          label="Enrollment Momentum"
          title={insights.momChange === null ? '—' : `+${insights.momChange.toFixed(1)}% MoM`}
          caption="completed enrollments, latest month"
          accent="violet"
        />
        <InsightCard
          icon={Users}
          label="Top Lead Sources"
          title={insights.topSources.join(', ')}
          caption="most leads in current roster"
          accent="slate"
        />
      </div>

      {/* Supporting photographic context — charts stay the main focus */}
      <PhotoCardGrid
        columns={2}
        items={[
          {
            src: '/images/analytics-charts.jpg',
            alt: 'A professional reviewing charts on a laptop monitor',
            title: 'From Data to Decisions',
            description: 'Every chart and KPI on this page derives from the real connected datasets.',
          },
          {
            src: '/images/analytics-tablet.jpg',
            alt: 'A professional reviewing graphs on a digital tablet',
            title: 'Insights Anywhere',
            description: 'Track pipeline health, intent and conversion at a glance.',
          },
        ]}
      />
    </div>
  )
}

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </Card>
  )
}

const INSIGHT_IMAGES: Record<string, { src: string; alt: string }> = {
  violet: {
    src: '/images/cap-ai-scoring.jpg',
    alt: 'An admissions professional reviewing AI score charts on a laptop',
  },
  emerald: {
    src: '/images/enrollment-celebration.jpg',
    alt: 'Students celebrating graduation outdoors',
  },
  slate: {
    src: '/images/analytics-tablet.jpg',
    alt: 'A professional reviewing graphs on a digital tablet',
  },
}

function InsightCard({ icon: Icon, label, title, caption, accent }: { icon: LucideIcon; label: string; title: string; caption: string; accent: 'violet' | 'emerald' | 'slate' }) {
  const image = INSIGHT_IMAGES[accent] ?? INSIGHT_IMAGES.slate
  return (
    <Card padding={false} className="group relative flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1">
      <CardImageHeader src={image.src} alt={image.alt} label={label} icon={Icon} heightClass="h-28" />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <p className="mt-1 text-[17px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
          {title}
        </p>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{caption}</p>
      </div>
    </Card>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Compiling analytics">
      <p className="text-[12px] font-medium uppercase tracking-wider text-slate-500">Compiling analytics…</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}

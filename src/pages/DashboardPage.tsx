import { useCallback, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Database,
  Download,
  RefreshCw,
  Users,
} from 'lucide-react'

import { AiInsightsSection } from '@/components/dashboard/AiInsightsSection'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { DailyBriefingSection } from '@/components/dashboard/DailyBriefingSection'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { DateRangeSelect } from '@/components/common/DateRangeSelect'
import { Badge } from '@/components/common/Badge'

import { ErrorState } from '@/components/common/ErrorState'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'

import { Skeleton } from '@/components/common/Skeleton'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useAiService } from '@/hooks/useAiService'
import { useChartColors } from '@/hooks/useChartColors'
import { getDashboardData, invalidateDatasetManifest, type DashboardPayload } from '@/services/datasetService'
import { Toast, type ToastState } from '@/components/ui/Toast'
import { exportCsv } from '@/utils/exportCsv'
import { cn } from '@/utils/cn'
import { useDateRange } from '@/context/DateRangeContext'
import type { DashboardRange } from '@/types/datasets'
import type { EnhancedDashboardData } from '@/services/crmApi'
import { apiRequest } from '@/services/authApi'

const RANGE_LABELS: Record<DashboardRange, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
  all: 'All Time',
}

const PIE_COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']

function globalToTrend(range: DashboardRange): '30d' | '90d' | '6m' | '1y' {
  switch (range) {
    case '90d': return '90d'
    case 'all': return '1y'
    default: return '30d'
  }
}

export function DashboardPage() {
  const { range, setRange } = useDateRange()
  const fetcher = useCallback(() => getDashboardData(range), [range])
  const { data, loading, error, retry } = useAsyncData(fetcher)
  const ai = useAiService()
  const [toast, setToast] = useState<ToastState | null>(null)

  const handleExport = () => {
    if (!data) {
      setToast({ kind: 'error', message: 'No dashboard data loaded to export yet.' })
      return
    }
    try {
      const rows: Array<Record<string, unknown>> = []
      for (const kpi of data.kpis) {
        rows.push({ Section: 'KPI', Metric: kpi.label, Value: kpi.value })
      }
      for (const stage of data.funnel) {
        rows.push({ Section: 'Funnel', Metric: stage.name, Value: stage.count, Detail: `${stage.pctOfTotal}%` })
      }
      for (const course of data.courses) {
        rows.push({ Section: 'Course', Metric: course.name, Value: course.enrollments })
      }
      exportCsv('edtech-dashboard-report.csv', rows)
      setToast({ kind: 'success', message: `Report exported (${RANGE_LABELS[range]}) — ${rows.length} rows.` })
    } catch {
      setToast({ kind: 'error', message: 'Could not generate the report download.' })
    }
  }

  return (
    <>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <PageHeader
        eyebrow="AI-Powered EdTech Intelligence"
        title="Executive Command Center"
        description="AI-powered overview of admissions, leads and sales performance."
        actions={
          <>
            <AiStatusIndicator status={ai.status} />
            <Button variant="secondary" size="sm" onClick={() => { invalidateDatasetManifest(); void retry() }}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <DateRangeSelect value={range} onChange={setRange} />
          </>
        }
      />

      {loading ? (
        <DashboardSkeleton />
      ) : error || !data ? (
        <ErrorState title="Dashboard unavailable" message={error ?? 'Could not load dashboard data.'} onRetry={retry} />
      ) : (
        <DashboardView data={data} range={range} aiStatus={ai.status} />
      )}
    </>
  )
}

function AiStatusIndicator({ status }: { status: 'checking' | 'connected' | 'unavailable' }) {
  const connected = status === 'connected'
  return (
    <span className={cn(
      'hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold md:inline-flex',
      connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300'
        : status === 'checking' ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300',
    )}>
      <span className={cn('relative flex h-2 w-2', connected ? 'bg-emerald-500' : status === 'checking' ? 'animate-pulse bg-slate-400' : 'bg-amber-500')} />
      {connected ? 'AI connected' : status === 'checking' ? 'Checking…' : 'AI unavailable'}
    </span>
  )
}

function DashboardView({ data, range, aiStatus }: { data: DashboardPayload; range: DashboardRange; aiStatus: 'checking' | 'connected' | 'unavailable' }) {
  return (
    <div className="space-y-6">
      <PageBanner compact src="/images/dashboard.jpg" alt="Students studying" label="Admissions Analytics" icon={Database} caption="Real-time analytics from the connected database." />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.kpis.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
      </div>

      {/* Enhanced Analytics Panels */}
      <EnhancedAnalyticsPanel range={range} />

      {/* Performance trend */}
      <Card>
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Lead & Enrollment Trend</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Daily lead creation and enrollment activity</p>
        <div className="mt-4 h-72">
          <TrendChart data={data.trends[globalToTrend(range)]} />
        </div>
      </Card>

      {/* Enhanced Funnel */}
      <EnhancedFunnelPanel range={range} />

      {/* Course Performance */}
      {data.courses.length > 0 && (
        <Card>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Course Performance</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Enrollment counts per active course</p>
          <div className="mt-4 space-y-3">
            {data.courses.map((c) => (
              <div key={c.id}>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                  <span className="tabular-nums text-slate-500">{c.enrollments} enrollments{c.revenue !== undefined ? ` · ${c.revenue}` : ''}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400" style={{ width: `${Math.min(100, (c.enrollments / Math.max(...data.courses.map((x) => x.enrollments), 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity activities={data.recentActivity} />

        {/* AI Daily Briefing */}
        <DailyBriefingSection />
      </div>

      {/* AI Insights */}
      <AiInsightsSection insights={data.aiInsights} serviceStatus={aiStatus} />
    </div>
  )
}

/* ===================== Enhanced Analytics Panels ====================== */

function EnhancedAnalyticsPanel({ range }: { range: DashboardRange }) {
  const [enhanced, setEnhanced] = useState<EnhancedDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEnhanced = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest<EnhancedDashboardData>(`/api/dashboard?range=${range}`)
      setEnhanced(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load enhanced analytics.')
    } finally {
      setLoading(false)
    }
  }, [range])

  // Auto-fetch on mount and range change
  if (!enhanced && !loading && !error) void fetchEnhanced()

  if (loading) return <Skeleton className="h-64 rounded-2xl" />
  if (error) return null // Non-critical — fall back to base dashboard
  if (!enhanced) return null

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Lead Source Distribution */}
      {enhanced.sourceDistribution.length > 0 && <SourceDistributionChart data={enhanced.sourceDistribution} />}

      {/* Application Status Distribution */}
      {enhanced.applicationStatusDistribution.length > 0 && <ApplicationStatusChart data={enhanced.applicationStatusDistribution} />}

      {/* Counselor Leaderboard */}
      {enhanced.counselorLeaderboard.length > 0 && <CounselorLeaderboard data={enhanced.counselorLeaderboard} />}

      {/* Dropout Risk Distribution */}
      {enhanced.dropoutRiskDistribution.length > 0 && <DropoutRiskChart data={enhanced.dropoutRiskDistribution} />}
    </div>
  )
}

function SourceDistributionChart({ data }: { data: Array<{ source: string; count: number }> }) {
  const colors = useChartColors()
  const total = data.reduce((a, b) => a + b.count, 0)
  return (
    <Card>
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Lead Source Distribution</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">Where leads are coming from</p>
      <div className="mt-4 flex items-center gap-6">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${value} leads`, 'Count']} contentStyle={{ borderRadius: 10, border: `1px solid ${colors.tooltip.border}`, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 space-y-2">
          {data.map((s, i) => (
            <li key={s.source} className="flex items-center gap-2 text-[12.5px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="flex-1 font-medium text-slate-700 dark:text-slate-300">{s.source}</span>
              <span className="tabular-nums text-slate-500">{s.count} ({(s.count / total * 100).toFixed(0)}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function ApplicationStatusChart({ data }: { data: Array<{ status: string; count: number }> }) {
  const colors = useChartColors()
  return (
    <Card>
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Application Status</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">Current enrollment pipeline breakdown</p>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis dataKey="status" tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${colors.tooltip.border}`, fontSize: 12 }} />
            <Bar dataKey="count" name="Records" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function CounselorLeaderboard({ data }: { data: Array<{ name: string; email: string; leads: number; qualified: number; converted: number; open_tasks: number; conversion_rate: number | null }> }) {
  return (
    <Card padding={false} className="overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Counselor Leaderboard</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Performance rankings from the lead pipeline</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-200 text-[10.5px] uppercase tracking-wider text-slate-500 dark:border-white/10">
              <th scope="col" className="px-4 py-2.5 font-semibold">Counselor</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Leads</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Qualified</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Converted</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Open Tasks</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Conv. Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((c) => (
              <tr key={c.email} className="transition-colors hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <Users className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
                      <p className="text-[10.5px] text-slate-500">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">{c.leads}</td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{c.qualified}</td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{c.converted}</td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{c.open_tasks}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {c.conversion_rate !== null ? `${c.conversion_rate}%` : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function DropoutRiskChart({ data }: { data: Array<{ risk: string; count: number }> }) {
  const riskColors: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' }
  const total = data.reduce((a, b) => a + b.count, 0)
  return (
    <Card>
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Student Dropout Risk</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">AI-predicted risk distribution across all students</p>
      <div className="mt-4 flex items-center gap-6">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="risk" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {data.map((entry) => <Cell key={entry.risk} fill={riskColors[entry.risk] ?? '#94a3b8'} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex-1 space-y-3">
          {data.map((r) => (
            <li key={r.risk}>
              <div className="flex items-baseline justify-between text-[12.5px]">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: riskColors[r.risk] ?? '#94a3b8' }} />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{r.risk} Risk</span>
                </span>
                <span className="tabular-nums text-slate-500">{r.count} students ({(r.count / total * 100).toFixed(0)}%)</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-full rounded-full" style={{ backgroundColor: riskColors[r.risk] ?? '#94a3b8', width: `${(r.count / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

/* ===================== Enhanced Funnel Panel ========================= */

function EnhancedFunnelPanel({ range }: { range: DashboardRange }) {
  const [enhanced, setEnhanced] = useState<EnhancedDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchEnhanced = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiRequest<EnhancedDashboardData>(`/api/dashboard?range=${range}`)
      setEnhanced(data)
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }, [range])

  if (!enhanced && !loading) void fetchEnhanced()

  const funnel = enhanced?.enhancedFunnel ?? []
  if (loading || funnel.length === 0) return null

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Conversion Funnel</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">From lead to enrollment — all stages with conversion rates</p>
        </div>
        {enhanced?.enhancedKpis?.period_comparison?.leads && (
          <Badge variant={enhanced.enhancedKpis.period_comparison.leads.change_pct >= 0 ? 'success' : 'danger'}>
            {enhanced.enhancedKpis.period_comparison.leads.change_pct >= 0 ? '+' : ''}
            {enhanced.enhancedKpis.period_comparison.leads.change_pct}% vs prev period
          </Badge>
        )}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {funnel.map((stage, i) => {
          const isFirst = i === 0
          const isLast = i === funnel.length - 1
          return (
            <div key={stage.id} className={cn(
              'relative rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5',
              isLast ? 'border-emerald-400/25 bg-emerald-50/60 dark:bg-emerald-500/[0.06]' : 'border-indigo-400/20 bg-indigo-50/60 dark:bg-indigo-500/[0.06]',
            )}>
              <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-xl', isLast ? 'bg-emerald-400/70' : 'bg-gradient-to-r from-violet-600 to-purple-400')} />
              <p className={cn('text-[10px] font-bold uppercase tracking-wider', isLast ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-300')}>{stage.name}</p>
              <p className="mt-2 text-[20px] font-bold tabular-nums text-slate-900 dark:text-white">{stage.count.toLocaleString()}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{isFirst ? 'Entry stage' : `${stage.conversion}% of previous`}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div className={cn('h-full rounded-full', isLast ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : 'bg-gradient-to-r from-violet-600 to-purple-400')} style={{ width: `${stage.pctOfTotal}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ===================== Trend Chart ================================== */

function TrendChart({ data }: { data: Array<{ label: string; leads: number; enrollments: number }> }) {
  const colors = useChartColors()
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/10">
        <p className="text-[12.5px] text-slate-500">No trend data available for this range.</p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="trend-leads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="trend-enrollments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} dy={6} />
        <YAxis tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
        <Tooltip contentStyle={{ ...colors.tooltip, borderRadius: 10, border: `1px solid ${colors.tooltip.border}`, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
        <Area type="monotone" dataKey="leads" name="Leads" stroke="#7c3aed" strokeWidth={2} fill="url(#trend-leads)" dot={false} activeDot={{ r: 4 }} />
        <Area type="monotone" dataKey="enrollments" name="Enrollments" stroke="#10b981" strokeWidth={2} fill="url(#trend-enrollments)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ===================== Skeleton ==================================== */

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-[18px]" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  )
}

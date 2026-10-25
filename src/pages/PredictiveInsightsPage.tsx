import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Loader2,
  RefreshCw,
  Rocket,
  Sparkles,
} from 'lucide-react'

import { AiServiceStatusCard } from '@/components/ai/AiServiceStatusCard'
import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/common/Skeleton'
import { useAiService } from '@/hooks/useAiService'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useChartColors } from '@/hooks/useChartColors'
import { getDashboardData } from '@/services/datasetService'
import { getDropoutAll, getPipelineForecast } from '@/services/crmApi'
import type { DropoutResult } from '@/services/crmApi'
import { cn } from '@/utils/cn'
import type { AiInsight } from '@/types/dashboard'


const riskVariant: Record<string, BadgeVariant> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
}

type ForecastPhase =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; forecast: Array<{ period: string; value: number }>; pipeline: { total_enrollments: number; average_monthly: number; trend: string; data_points: number } }
  | { phase: 'error'; error: string }

type DropoutPhase =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; results: DropoutResult[]; summary: { total: number; high_risk: number; medium_risk: number; low_risk: number } }
  | { phase: 'error'; error: string }

export function PredictiveInsightsPage() {
  const { data, loading, error, retry } = useAsyncData(
    useCallback(() => getDashboardData('all'), []),
  )
  const ai = useAiService()

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Predictive Intelligence"
        title="Predictive Insights"
        description="AI-powered signals for smarter admissions decisions — all from real data."
      />

      {loading ? (
        <PredictiveSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={retry} />
      ) : data.aiInsights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Predictive insights unavailable"
          description="Prediction results will appear when there is enough data."
          className="py-20"
        />
      ) : (
        <PredictiveView
          insights={data.aiInsights}
          aiStatus={ai.status}
          aiDetail={ai.detail}
          aiBaseUrl={ai.baseUrl}
          onAiRetry={ai.retry}
        />
      )}
    </>
  )
}

function PredictiveView({
  insights,
  aiStatus,
  aiDetail,
  aiBaseUrl,
  onAiRetry,
}: {
  insights: AiInsight[]
  aiStatus: 'checking' | 'connected' | 'unavailable'
  aiDetail: string
  aiBaseUrl: string
  onAiRetry: () => void
}) {
  const signals = insights

  return (
    <div className="space-y-6">
      <AiServiceStatusCard status={aiStatus} detail={aiDetail} baseUrl={aiBaseUrl} onRetry={onAiRetry} />

      {/* Live DB-backed predictions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DropoutPanel />
        <ForecastPanel />
      </div>

      {/* AI prediction status */}
      <Card className="flex items-start gap-3 border border-amber-400/25 bg-amber-50/60 dark:bg-amber-500/[0.06]">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <Rocket className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
            AI prediction service {aiStatus === 'connected' ? 'connected' : 'not connected'}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400">
            {aiStatus === 'connected'
              ? 'Live predictions generated from real database data. Scores and risks are computed from actual student and lead attributes.'
              : 'The database-driven scoring works regardless of the external AI service. Click the panels above to generate predictions.'}
          </p>
        </div>
      </Card>

      {/* Database signals */}
      <div>
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900 dark:text-white">Database Signals</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {signals.map((insight) => (
            <SignalCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DropoutPanel() {
  const [state, setState] = useState<DropoutPhase>({ phase: 'idle' })

  const runPrediction = useCallback(async () => {
    setState({ phase: 'loading' })
    try {
      const res = await getDropoutAll()
      setState({ phase: 'done', results: res.results, summary: res.summary })
    } catch (err) {
      setState({ phase: 'error', error: err instanceof Error ? err.message : 'Could not run dropout prediction.' })
    }
  }, [])

  // Auto-run on mount
  useEffect(() => { void runPrediction() }, [runPrediction])

  const results = state.phase === 'done' ? state.results : []
  const summary = state.phase === 'done' ? state.summary : null

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Dropout Risk Analysis</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">AI predictions for real database students</p>
        </div>
        <Button variant="secondary" size="sm" onClick={runPrediction} disabled={state.phase === 'loading'}>
          {state.phase === 'loading' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</>
          ) : (
            <><RefreshCw className="h-3.5 w-3.5" /> Re-analyze</>
          )}
        </Button>
      </div>

      {state.phase === 'loading' && (
        <div className="mt-4 space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
        </div>
      )}

      {state.phase === 'error' && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3 dark:border-rose-400/25 dark:bg-rose-500/[0.07]">
          <p className="text-[13px] font-semibold text-rose-800 dark:text-rose-200">Prediction failed</p>
          <p className="mt-0.5 text-[12.5px] text-rose-700 dark:text-rose-300">{state.error}</p>
          <Button variant="secondary" size="sm" className="mt-2.5" onClick={runPrediction}><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
        </div>
      )}

      {state.phase === 'done' && summary && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(['High', 'Medium', 'Low'] as const).map((risk) => (
              <div key={risk} className="rounded-xl border border-slate-200 bg-white/[0.03] px-3 py-2.5 text-center dark:border-white/10">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{risk} Risk</p>
                <p className="mt-0.5 text-[16px] font-bold tabular-nums text-slate-900 dark:text-white">
                  {risk === 'High' ? summary.high_risk : risk === 'Medium' ? summary.medium_risk : summary.low_risk}
                </p>
              </div>
            ))}
          </div>
          {results.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto">
              <table className="w-full text-left text-[13px]">
                <caption className="sr-only">Dropout predictions for real students</caption>
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 dark:border-white/10">
                    <th scope="col" className="px-3 py-2.5 font-semibold">Student</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Risk Factor</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Probability</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 20).map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{r.name}</p>
                        <p className="text-[11px] text-slate-500">{r.course || '—'}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-slate-600 dark:text-slate-400">{r.reasons[0] || '—'}</td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-300">
                        {(r.probability * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={riskVariant[r.risk] ?? 'neutral'}>{r.risk}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 border-t border-slate-100 pt-3 text-[11.5px] text-slate-500 dark:border-white/5 dark:text-slate-400">
            {summary.total} students analyzed. Risk computed from attendance, academic level, and enrollment signals.
          </p>
        </>
      )}
    </Card>
  )
}

function ForecastPanel() {
  const colors = useChartColors()
  const [state, setState] = useState<ForecastPhase>({ phase: 'idle' })

  const runForecast = useCallback(async () => {
    setState({ phase: 'loading' })
    try {
      const res = await getPipelineForecast()
      setState({ phase: 'done', forecast: res.forecast, pipeline: res.pipeline })
    } catch (err) {
      setState({ phase: 'error', error: err instanceof Error ? err.message : 'Could not generate forecast.' })
    }
  }, [])

  useEffect(() => { void runForecast() }, [runForecast])

  const forecast = state.phase === 'done' ? state.forecast : []
  const pipeline = state.phase === 'done' ? state.pipeline : null

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Enrollment Forecast</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">AI forecast from actual pipeline data</p>
        </div>
        <Button variant="secondary" size="sm" onClick={runForecast} disabled={state.phase === 'loading'}>
          {state.phase === 'loading' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Forecasting…</>
          ) : (
            <><RefreshCw className="h-3.5 w-3.5" /> Re-forecast</>
          )}
        </Button>
      </div>

      {state.phase === 'loading' && (
        <div className="mt-4 space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
        </div>
      )}

      {state.phase === 'error' && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3 dark:border-rose-400/25 dark:bg-rose-500/[0.07]">
          <p className="text-[13px] font-semibold text-rose-800 dark:text-rose-200">Forecast failed</p>
          <p className="mt-0.5 text-[12.5px] text-rose-700 dark:text-rose-300">{state.error}</p>
          <Button variant="secondary" size="sm" className="mt-2.5" onClick={runForecast}><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
        </div>
      )}

      {state.phase === 'done' && pipeline && (
        <>
          {forecast.length > 0 ? (
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.map((p) => ({ name: p.period.slice(5), value: p.value }))} margin={{ top: 5, right: 8, bottom: 0, left: -14 }}>
                  <defs>
                    <linearGradient id="forecast-grad-pred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} dy={6} />
                  <YAxis tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip contentStyle={{ ...colors.tooltip, borderRadius: 10, border: `1px solid ${colors.tooltip.border}`, fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" name="Forecasted Enrollments" stroke="#7c3aed" strokeWidth={2} fill="url(#forecast-grad-pred)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/10">
              <p className="text-[12.5px] text-slate-500">Not enough historical data for forecasting. Add more enrollment records.</p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white/[0.03] px-3 py-2.5 text-center dark:border-white/10">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Total Enrollments</p>
              <p className="mt-0.5 text-[16px] font-bold tabular-nums text-slate-900 dark:text-white">{pipeline.total_enrollments}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/[0.03] px-3 py-2.5 text-center dark:border-white/10">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Avg/Month</p>
              <p className="mt-0.5 text-[16px] font-bold tabular-nums text-slate-900 dark:text-white">{pipeline.average_monthly}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/[0.03] px-3 py-2.5 text-center dark:border-white/10">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Trend</p>
              <Badge variant={pipeline.trend === 'increasing' ? 'success' : pipeline.trend === 'decreasing' ? 'danger' : 'info'}>{pipeline.trend}</Badge>
            </div>
          </div>

          <p className="mt-3 border-t border-slate-100 pt-3 text-[11.5px] text-slate-500 dark:border-white/5 dark:text-slate-400">
            {forecast.length} periods forecasted using damped linear trend on {pipeline.data_points} months of real enrollment data.
          </p>
        </>
      )}
    </Card>
  )
}

function SignalCard({ insight }: { insight: AiInsight }) {
  const toneStyles: Record<string, string> = {
    warning: 'border-amber-400/25 bg-amber-50/60 dark:bg-amber-500/[0.06]',
    success: 'border-emerald-400/25 bg-emerald-50/60 dark:bg-emerald-500/[0.06]',
    info: 'border-sky-400/25 bg-sky-50/60 dark:bg-sky-500/[0.06]',
    brand: 'border-indigo-400/25 bg-indigo-50/60 dark:bg-indigo-500/[0.06]',
  }
  return (
    <div className={cn('rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5', toneStyles[insight.tone] ?? toneStyles.info)}>
      <Badge variant={insight.priority === 'High' ? 'danger' : insight.priority === 'Medium' ? 'warning' : 'info'}>{insight.priority}</Badge>
      <p className="mt-2 text-[13px] font-semibold text-slate-900 dark:text-white">{insight.title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">{insight.message}</p>
    </div>
  )
}

function PredictiveSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading predictive insights">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  )
}

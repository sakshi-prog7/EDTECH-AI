import { useCallback, useState } from 'react'
import { CircleAlert, Gauge, Loader2, RefreshCw, Sparkles, Target } from 'lucide-react'

import { AiServiceStatusCard } from '@/components/ai/AiServiceStatusCard'

import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { PaginationBar } from '@/components/common/PaginationBar'
import { Skeleton } from '@/components/common/Skeleton'
import { useAiService } from '@/hooks/useAiService'
import { useAsyncData } from '@/hooks/useAsyncData'
import { scoreAllLeads, listLeads } from '@/services/crmApi'
import type { EnrichedLeadScore } from '@/services/crmApi'


type ScorePhase =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; results: EnrichedLeadScore[]; summary: { total: number; high_intent: number; medium_intent: number; low_intent: number; average_score: number } }
  | { phase: 'error'; error: string }

const fmtInt = (n: number): string => Math.round(n).toLocaleString('en-US')

const riskVariant: Record<string, BadgeVariant> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
}

const catVariant: Record<string, BadgeVariant> = {
  'High Intent': 'success',
  'Medium Intent': 'warning',
  'Low Intent': 'neutral',
}

const PAGE_SIZE = 10

export function LeadScoringPage() {
  const fetcher = useCallback(() => listLeads({ pageSize: 100 }), [])
  const { data, loading, error, retry } = useAsyncData(fetcher)
  const ai = useAiService()

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Lead Scoring"
        title="AI Lead Scoring"
        description="Identify high-intent students before they convert — scored from real engagement data."
      />

      <PageBanner
        src="/images/lead-scoring.jpg"
        alt="Students working on laptops in a university lecture hall"
        label="AI Lead Scoring"
        icon={Sparkles}
        caption="Every lead scored by real engagement signals — no synthetic data, no fake scores."
      />

      {loading ? (
        <ScoringSkeleton />
      ) : error ? (
        <ErrorState message={error ?? undefined} onRetry={retry} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No leads available"
          description="Create some leads first, then come back to see AI scoring results."
          className="py-20"
        />
      ) : (
        <ScoringView rows={data.items} aiStatus={ai.status} aiDetail={ai.detail} aiBaseUrl={ai.baseUrl} onAiRetry={ai.retry} />
      )}
    </>
  )
}

function ScoringView({
  rows,
  aiStatus,
  aiDetail,
  aiBaseUrl,
  onAiRetry,
}: {
  rows: Array<{ id: string; name: string; email?: string | null; source?: string; status?: string; engagement?: number; interactions?: number; score?: number | null; priority?: string; course_interest?: string | null }>
  aiStatus: 'checking' | 'connected' | 'unavailable'
  aiDetail: string
  aiBaseUrl: string
  onAiRetry: () => void
}) {
  const totalLeads = rows.length
  const [scoreState, setScoreState] = useState<ScorePhase>({ phase: 'idle' })
  const [page, setPage] = useState(1)
  const [detailLead, setDetailLead] = useState<EnrichedLeadScore | null>(null)

  const runScoring = useCallback(async () => {
    setScoreState({ phase: 'loading' })
    try {
      const res = await scoreAllLeads()
      setScoreState({ phase: 'done', results: res.results, summary: res.summary })
    } catch (err) {
      setScoreState({ phase: 'error', error: err instanceof Error ? err.message : 'Scoring service unavailable.' })
    }
  }, [])

  const results = scoreState.phase === 'done' ? scoreState.results : []
  const summary = scoreState.phase === 'done' ? scoreState.summary : null
  const pagedResults = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(results.length / PAGE_SIZE)

  // Source distribution from raw data
  const sourceMap = new Map<string, number>()
  for (const r of rows) { const s = r.source || '(unknown)'; sourceMap.set(s, (sourceMap.get(s) ?? 0) + 1) }
  const sources = [...sourceMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  const maxSource = Math.max(...sources.map((s) => s.count), 1)

  // Status distribution from raw data
  const statusMap = new Map<string, number>()
  for (const r of rows) { const s = r.status || 'NEW'; statusMap.set(s, (statusMap.get(s) ?? 0) + 1) }
  const statuses = [...statusMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* AI service status */}
      <AiServiceStatusCard
        status={aiStatus}
        detail={aiDetail}
        baseUrl={aiBaseUrl}
        onRetry={onAiRetry}
      />

      {/* Enhanced scoring panel */}
      <Card className="border-indigo-400/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Enhanced AI Lead Scoring</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Weighted scoring using engagement, funnel stage, channel quality, interactions and recency — all from the real database
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={runScoring} disabled={scoreState.phase === 'loading'}>
            {scoreState.phase === 'loading' ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scoring leads…</>
            ) : scoreState.phase === 'done' ? (
              <><RefreshCw className="h-3.5 w-3.5" /> Re-score all</>
            ) : (
              <><Gauge className="h-3.5 w-3.5" /> Score all leads</>
            )}
          </Button>
        </div>

        {scoreState.phase === 'loading' && (
          <div className="mt-4 space-y-3" aria-busy="true" aria-label="Scoring leads">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400">Analyzing {rows.length} real leads with enhanced algorithm…</p>
          </div>
        )}

        {scoreState.phase === 'error' && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3 dark:border-rose-400/25 dark:bg-rose-500/[0.07]">
            <span className="mt-0.5 text-rose-600 dark:text-rose-400"><CircleAlert className="h-4 w-4" /></span>
            <div>
              <p className="text-[13px] font-semibold text-rose-800 dark:text-rose-200">Scoring failed</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-rose-700 dark:text-rose-300">{scoreState.error}</p>
              <Button variant="secondary" size="sm" className="mt-2.5" onClick={runScoring}><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
            </div>
          </div>
        )}

        {scoreState.phase === 'done' && summary && (
          <div className="mt-4 space-y-4">
            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-50/60 px-3.5 py-3 dark:bg-emerald-500/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">High Intent</p>
                <p className="mt-1 text-[20px] font-bold tabular-nums text-slate-900 dark:text-white">{summary.high_intent}</p>
                <p className="text-[11px] text-slate-500">Score ≥ 75</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-50/60 px-3.5 py-3 dark:bg-amber-500/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Medium Intent</p>
                <p className="mt-1 text-[20px] font-bold tabular-nums text-slate-900 dark:text-white">{summary.medium_intent}</p>
                <p className="text-[11px] text-slate-500">Score 50–74</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Low Intent</p>
                <p className="mt-1 text-[20px] font-bold tabular-nums text-slate-900 dark:text-white">{summary.low_intent}</p>
                <p className="text-[11px] text-slate-500">Score &lt; 50</p>
              </div>
              <div className="rounded-xl border border-indigo-400/20 bg-indigo-50/60 px-3.5 py-3 dark:bg-indigo-500/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Average Score</p>
                <p className="mt-1 text-[20px] font-bold tabular-nums text-slate-900 dark:text-white">{summary.average_score}</p>
                <p className="text-[11px] text-slate-500">out of 100</p>
              </div>
            </div>

            {/* Results table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-[13px]">
                <caption className="sr-only">Lead scoring results</caption>
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 dark:border-white/10">
                    <th scope="col" className="px-3 py-2.5 font-semibold">Lead</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Category</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Score</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Key Factor</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Next Action</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedResults.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-[#FAF7FF] dark:border-white/5 dark:hover:bg-white/[0.04]">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</p>
                        <p className="text-[11px] text-slate-500">{r.source} · {r.status}</p>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={catVariant[r.category] ?? 'neutral'}>{r.category}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400" style={{ width: `${r.score}%` }} />
                          </div>
                          <span className="tabular-nums font-semibold text-slate-900 dark:text-white">{r.score}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 max-w-[200px] truncate text-[12px] text-slate-600 dark:text-slate-400">
                        {r.reasons[0] || '—'}
                      </td>
                      <td className="px-3 py-3 max-w-[200px] truncate text-[12px] text-slate-600 dark:text-slate-400">
                        {r.next_action}
                      </td>
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => setDetailLead(r)} className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <PaginationBar page={page} pages={totalPages} total={results.length} onPage={setPage} />
            )}

            <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              {results.length} leads scored using enhanced model v2. Scores, categories and next actions are computed from real database attributes.
            </p>
          </div>
        )}
      </Card>

      {/* Raw data summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Leads by Source</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">From the EDTECH AI database</p>
          <ul className="mt-4 space-y-3">
            {sources.map((s) => (
              <li key={s.name}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                  <span className="tabular-nums font-semibold text-slate-900 dark:text-white">{fmtInt(s.count)}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Leads by Status</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">EDTECH AI Database</p>
          <ul className="mt-4 space-y-3">
            {statuses.map((s) => (
              <li key={s.name}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                  <span className="tabular-nums font-semibold text-slate-900 dark:text-white">{fmtInt(s.count)}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400" style={{ width: `${(s.count / totalLeads) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Detail modal */}
      {detailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" onClick={() => setDetailLead(null)}>
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{detailLead.name}</h3>
                <p className="text-[12.5px] text-slate-500">{detailLead.email || 'No email'} · {detailLead.source}</p>
              </div>
              <button onClick={() => setDetailLead(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Score</p>
                <p className="text-[20px] font-bold text-slate-900 dark:text-white">{detailLead.score}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Probability</p>
                <p className="text-[20px] font-bold text-slate-900 dark:text-white">{(detailLead.probability * 100).toFixed(0)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Risk</p>
                <Badge variant={riskVariant[detailLead.risk] ?? 'neutral'}>{detailLead.risk}</Badge>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Contributing Factors</h4>
              <ul className="mt-2 space-y-1.5">
                {detailLead.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate-600 dark:text-slate-400">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-50/60 p-3.5 dark:bg-indigo-500/[0.07]">
              <p className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-300">Recommended Next Action</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">{detailLead.next_action}</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500">
              <Target className="h-3 w-3" />
              Status: {detailLead.status} · Eng: {detailLead.engagement}% · Interactions: {detailLead.interactions}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScoringSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading lead intelligence">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  )
}

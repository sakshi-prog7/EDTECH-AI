import { useCallback } from 'react'
import { CheckCircle2, Medal, TrendingUp, Users } from 'lucide-react'

import { AiStatCard } from '@/components/ai/AiStatCard'
import { Card } from '@/components/common/Card'
import { ErrorState } from '@/components/common/ErrorState'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/common/Skeleton'
import { useAsyncData } from '@/hooks/useAsyncData'
import { listCounselorPerformance } from '@/services/crmApi'
import type { CounselorPerformance } from '@/services/crmApi'

export function CounselorsPage() {
  const fetcher = useCallback(() => listCounselorPerformance(), [])
  const { data, loading, error, retry } = useAsyncData(fetcher)
  const counselors = data?.counselors ?? []

  const totals = counselors.reduce(
    (acc, c) => {
      acc.leads += c.leads
      acc.converted += c.converted
      acc.openTasks += c.open_tasks
      return acc
    },
    { leads: 0, converted: 0, openTasks: 0 },
  )
  const teamConversion = totals.leads > 0 ? (totals.converted / totals.leads) * 100 : 0

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Counselors"
        title="Counselor Performance"
        description="Counselor activity, conversions and rankings across the admissions team."
      />

      <PageBanner
        src="/images/why-counselling.jpg"
        alt="An admissions counsellor assisting a student with exam preparation on a laptop"
        label="Admissions Team"
        icon={Medal}
        caption="Real per-counselor metrics from the lead pipeline — who's converting and what still needs attention."
      />

      {loading ? (
        <CounselorsSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : counselors.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-200">No counselors found</p>
          <p className="mt-1 text-[12.5px] text-slate-500">
            Assign leads to counselor accounts to see performance here.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Team summary */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AiStatCard icon={Users} label="Counselors" value={String(counselors.length)} caption="active team members" accent="violet" />
            <AiStatCard icon={Users} label="Assigned Leads" value={totals.leads.toLocaleString()} caption="leads in their pipelines" accent="sky" />
            <AiStatCard icon={CheckCircle2} label="Conversions" value={totals.converted.toLocaleString()} caption="leads converted" accent="emerald" />
            <AiStatCard icon={TrendingUp} label="Team Conversion" value={`${teamConversion.toFixed(1)}%`} caption="assigned lead → conversion" accent="amber" />
          </div>

          {/* Counselor table */}
          <Card padding={false} className="overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Rankings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sorted by conversion rate — real numbers from the lead pipeline
              </p>
            </div>
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <caption className="sr-only">Counselor performance rankings</caption>
                <thead>
                  <tr className="border-y border-slate-200 bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500 dark:border-white/10">
                    <th scope="col" className="px-5 py-2.5 font-semibold">Counselor</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Leads</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Qualified</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Converted</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Open Tasks</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {counselors.map((c) => (
                    <tr key={c.user_id} className="transition-colors duration-200 hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <Medal className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
                            <p className="truncate text-[11px] text-slate-500">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {c.leads}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {c.qualified}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {c.converted}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {c.open_tasks}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {c.conversion_rate === null ? '—' : `${c.conversion_rate}%`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

function CounselorsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading counselor performance">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}

export type { CounselorPerformance }

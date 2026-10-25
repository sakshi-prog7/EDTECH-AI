import { Inbox, TrendingDown } from 'lucide-react'

import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import type { FunnelStage } from '@/types/dashboard'

export function LeadFunnel({ stages }: { stages: FunnelStage[] }) {
  const maxCount = stages[0]?.count ?? 1
  const first = stages[0]
  const last = stages[stages.length - 1]
  const overall =
    first && last && first.count > 0 ? ((last.count / first.count) * 100).toFixed(1) : null

  return (
    <Card padding={false} className="flex h-full flex-col overflow-hidden">
      <CardImageHeader
        src="/images/leads-counselling.jpg"
        alt="An admissions counsellor helping a prospective student review course options on a laptop"
        label="Lead Funnel"
        icon={Inbox}
      />
      <div className="flex flex-1 flex-col p-5">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Lead Conversion Funnel</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">From new lead to enrollment</p>
      </div>

      {stages.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="INSUFFICIENT DATA"
          description="This metric will become available when the required dataset is connected."
        />
      )}

      <div className="flex flex-1 flex-col justify-center gap-3">
        {stages.map((stage, index) => {
          const width = Math.max(18, (stage.count / maxCount) * 100)
          return (
            <div key={stage.id} className="group flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-[12.5px] font-medium text-slate-600 dark:text-slate-300">
                {stage.name}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center">
                  <div
                    className="h-9 rounded-lg bg-gradient-to-r from-violet-600/85 to-purple-500/85 transition-all group-hover:from-violet-600 group-hover:to-purple-500 dark:from-violet-500/70 dark:to-purple-400/70"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="mt-1 text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                  {index === 0
                    ? '100% of leads'
                    : `${stage.conversion}% of previous stage`}
                </p>
              </div>
              <div className="w-28 shrink-0 text-right">
                <p className="text-[13.5px] font-bold tabular-nums text-slate-800 dark:text-slate-100">
                  {stage.count.toLocaleString()}
                </p>
                <p className="text-[10.5px] tabular-nums text-slate-500 dark:text-slate-400">
                  {stage.pctOfTotal}% of total
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-3 text-[11.5px] text-slate-500 dark:border-white/10 dark:text-slate-400">
        <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
        {overall
          ? `Overall conversion: ${overall}% (${last.count.toLocaleString()} / ${first.count.toLocaleString()})`
          : 'Funnel data not available for the connected dataset.'}
      </div>
      </div>
    </Card>
  )
}

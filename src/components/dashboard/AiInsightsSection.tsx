import { Sparkles } from 'lucide-react'

import { AiSignalCard } from '@/components/ai/AiSignalCard'
import { Badge } from '@/components/common/Badge'
import { Card } from '@/components/common/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import type { AiServiceStatus } from '@/types/ai'
import type { AiInsight } from '@/types/dashboard'

export function AiInsightsSection({
  insights,
  serviceStatus = 'unavailable',
}: {
  insights: AiInsight[]
  /** Live status of the Member 2 AI service (from useAiService). */
  serviceStatus?: AiServiceStatus
}) {
  return (
    <section aria-labelledby="ai-insights-heading">
      <div className="mb-4 flex items-center gap-3">
        <div>
          <h2
            id="ai-insights-heading"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            AI Sales Intelligence
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dataset-derived signals — AI service {serviceStatus === 'connected' ? 'connected' : 'unavailable'}
          </p>
        </div>
        <ServiceChip status={serviceStatus} />
      </div>

      {insights.length === 0 ? (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="AI insights awaiting model output"
            description="AI-generated insights will appear once Member 1's ML output or a connected dataset is available. No scores are fabricated."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {insights.map((insight) => (
            <AiSignalCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </section>
  )
}

/** Small honest chip reflecting the live AI-service connection state. */
function ServiceChip({ status }: { status: AiServiceStatus }) {
  const connected = status === 'connected'
  const checking = status === 'checking'
  return (
    <Badge
      variant={connected ? 'success' : 'neutral'}
      className={cn(
        'ml-auto shrink-0',
        !connected && !checking && 'border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300',
        checking && 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400',
      )}
    >
      {checking ? (
        <>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
          Checking AI service…
        </>
      ) : connected ? (
        <>
          <Sparkles className="h-3 w-3" />
          AI service connected
        </>
      ) : (
        <>
          <Sparkles className="h-3 w-3" />
          AI service unavailable
        </>
      )}
    </Badge>
  )
}

import { useCallback } from 'react'
import { RefreshCw, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { KpiCard } from '@/components/dashboard/KpiCard'
import { Button } from '@/components/common/Button'
import { DateRangeSelect } from '@/components/common/DateRangeSelect'
import { ErrorState } from '@/components/common/ErrorState'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { PhotoCardGrid } from '@/components/common/PhotoCardGrid'
import { Skeleton } from '@/components/common/Skeleton'
import { LeadTable } from '@/components/leads/LeadTable'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDateRange } from '@/context/DateRangeContext'
import { getDashboardData } from '@/services/datasetService'
import { cn } from '@/utils/cn'

/** Lead-focused KPIs derived from the real connected datasets. */
const LEAD_KPI_IDS = ['total-leads', 'qualified-leads', 'enrollment-conversion', 'active-opportunities']

export function LeadsPage() {
  const { range } = useDateRange()
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const kpiFetcher = useCallback(() => getDashboardData(range), [range])
  const { data, loading, error, retry } = useAsyncData(kpiFetcher)

  return (
    <>
      <PageHeader
        eyebrow="AI-Powered Lead Intelligence"
        title="Leads"
        description="Every inquiry becomes a scored lead — manage the full pipeline from one workspace."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={retry}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
            <DateRangeSelect />
          </>
        }
      />

      <PageBanner
        src="/images/leads-counselling.jpg"
        alt="An admissions counsellor helping a prospective student review course options on a laptop in a library"
        label="Admissions Counselling"
        icon={Users}
        caption="Every inquiry becomes a scored lead — counselling conversations, course interest and campaign touchpoints, unified in one pipeline."
      />

      {loading ? (
        <LeadsSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={retry} />
      ) : (
        <div className="space-y-6">
          {/* Lead summary — real KPIs (unsupported metrics show N/A) */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.kpis
              .filter((kpi) => LEAD_KPI_IDS.includes(kpi.id))
              .map((kpi) => (
                <KpiCard key={kpi.id} kpi={kpi} />
              ))}
          </div>

          <LeadTable initialQuery={initialQuery} />
        </div>
      )}

      <div className="mt-8">
        <PhotoCardGrid
          label="Admissions in Action"
          items={[
            {
              src: '/images/leads-prospect.jpg',
              alt: 'A prospective student studying with a laptop in a library',
              title: 'Prospect Conversations',
              description: 'Every inquiry — from first message to counselling call — becomes a trackable lead.',
            },
            {
              src: '/images/leads-counselling-2.jpg',
              alt: 'A teacher and a student in front of a computer',
              title: 'Counselling at Scale',
              description: 'Advisors guide prospects with full context on interests and intent.',
            },
            {
              src: '/images/leads-consultant.jpg',
              alt: 'An education consultant working with a smartphone and laptop in an office',
              title: 'Consultants in the Loop',
              description: 'Education consultants qualify and route leads from one workspace.',
            },
          ]}
        />
      </div>
    </>
  )
}

function LeadsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading leads">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  )
}

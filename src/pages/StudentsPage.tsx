import { useCallback } from 'react'
import { GraduationCap, RefreshCw } from 'lucide-react'

import { KpiCard } from '@/components/dashboard/KpiCard'
import { Button } from '@/components/common/Button'
import { DateRangeSelect } from '@/components/common/DateRangeSelect'
import { ErrorState } from '@/components/common/ErrorState'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { PhotoCardGrid } from '@/components/common/PhotoCardGrid'
import { Skeleton } from '@/components/common/Skeleton'
import { StudentTable } from '@/components/students/StudentTable'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDateRange } from '@/context/DateRangeContext'
import { getDashboardData } from '@/services/datasetService'
import { cn } from '@/utils/cn'

/** Student-relevant KPIs derived from the real connected datasets. */
const STUDENT_KPI_IDS = ['total-students', 'enrollment-conversion']

export function StudentsPage() {
  const { range } = useDateRange()

  const kpiFetcher = useCallback(() => getDashboardData(range), [range])
  const { data, loading, error, retry } = useAsyncData(kpiFetcher)

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Student Intelligence"
        title="Students"
        description="Track student profiles, interests and engagement across the admissions journey."
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
        src="/images/students-collaborating.jpg"
        alt="Three college students studying together outdoors on a campus with laptops"
        label="Student Intelligence"
        icon={GraduationCap}
        caption="Every student across the connected roster — engagement, progress and risk signals in one intelligent view."
      />

      {loading ? (
        <StudentsSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={retry} />
      ) : (
        <div className="space-y-6">
          {/* Student summary — real KPIs from the dashboard API */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.kpis
              .filter((kpi) => STUDENT_KPI_IDS.includes(kpi.id))
              .map((kpi) => (
                <KpiCard key={kpi.id} kpi={kpi} />
              ))}
          </div>

          <StudentTable />
        </div>
      )}

      <div className="mt-8">
        <PhotoCardGrid
          label="Student Engagement in Practice"
          items={[
            {
              src: '/images/students-studying.jpg',
              alt: 'College students studying together at a library table',
              title: 'Focused Learning',
              description: 'Understand how students engage across courses and programs.',
            },
            {
              src: '/images/students-laptops.jpg',
              alt: 'Students studying with laptops and books in a library',
              title: 'Learning with Technology',
              description: 'Digital learning signals feed student profiles in real time.',
            },
            {
              src: '/images/students-collaborating-2.jpg',
              alt: 'A diverse group of students collaborating indoors',
              title: 'Collaborative Study',
              description: 'Group work and collaboration surface in engagement analytics.',
            },
          ]}
        />
      </div>
    </>
  )
}

function StudentsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading students">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  )
}

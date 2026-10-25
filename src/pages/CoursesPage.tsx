import { useCallback, useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BookOpen, GraduationCap, Library, Rocket } from 'lucide-react'

import { AiStatCard } from '@/components/ai/AiStatCard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'
import { CourseCatalog } from '@/components/courses/CourseCatalog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { PhotoCardGrid } from '@/components/common/PhotoCardGrid'
import { Skeleton } from '@/components/common/Skeleton'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useChartColors } from '@/hooks/useChartColors'
import { getDashboardData } from '@/services/datasetService'
import type { CoursePerformanceItem, Kpi } from '@/types/dashboard'

const COURSE_IMAGES = [
  { src: '/images/courses-selection.jpg', alt: 'Students selecting courses in a lecture hall' },
  { src: '/images/courses-tech.jpg', alt: 'Students in a technology classroom using computers' },
  { src: '/images/courses-online.jpg', alt: 'A person taking notes during an online learning session' },
  { src: '/images/courses-online-learning.jpg', alt: 'A student learning online with a laptop' },
]

/** Rotates relevant education photos across course cards. */
function CourseCardImage({ index }: { index: number }) {
  const image = COURSE_IMAGES[index % COURSE_IMAGES.length]
  return <CardImageHeader src={image.src} alt={image.alt} label="Course" icon={GraduationCap} />
}

export function CoursesPage() {
  const { data, loading, error, retry } = useAsyncData(useCallback(() => getDashboardData('all'), []))

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Courses"
        title="Course Intelligence"
        description="Course demand, program planning and the live course catalog."
      />

      <PageBanner
        src="/images/courses-online-learning.jpg"
        alt="A student focused on an online course, writing notes beside a laptop"
        label="Course Discovery & Learning"
        icon={BookOpen}
        caption="Course demand, registrations and learning paths — real intelligence for smarter program planning."
      />

      {loading ? (
        <CoursesSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={retry} />
      ) : data.courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No course data available"
          description="There is currently not enough information to display course intelligence."
          className="py-20"
        />
      ) : (
        <CoursesView courses={data.courses} studentsKpi={data.kpis.find((k) => k.id === 'total-students') ?? null} />
      )}

      <div className="mt-8">
        <PhotoCardGrid
          label="Course Discovery & Learning"
          items={[
            {
              src: '/images/courses-selection.jpg',
              alt: 'Students raising their hands during a university lecture',
              title: 'Course Selection',
              description: 'See which programs attract the most interest and applications.',
            },
            {
              src: '/images/courses-online.jpg',
              alt: 'A person taking notes during an online learning session',
              title: 'Online Learning',
              description: 'Track demand across online and blended course offerings.',
            },
            {
              src: '/images/courses-tech.jpg',
              alt: 'Students in a technology classroom using computers',
              title: 'Technology Education',
              description: 'High-demand tech programs surface first in the catalog.',
            },
          ]}
        />
      </div>
    </>
  )
}

function CoursesView({
  courses,
  studentsKpi,
}: {
  courses: CoursePerformanceItem[]
  studentsKpi: Kpi | null
}) {
  const colors = useChartColors()

  // Real per-course student counts (dropout dataset course distribution).
  const byCourse = useMemo(
    () => courses.map((course) => ({ name: course.name, students: course.enrollments })),
    [courses],
  )

  const topCourse = useMemo(() => [...courses].sort((a, b) => b.enrollments - a.enrollments)[0], [courses])
  const maxEnrollments = Math.max(...courses.map((c) => c.enrollments), 1)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AiStatCard icon={GraduationCap} label="Active Courses" value={String(courses.length)} caption="from dropout dataset" accent="sky" />
        {studentsKpi && <KpiCard kpi={studentsKpi} />}
        <AiStatCard icon={Rocket} label="Top Course" value={topCourse?.name ?? '—'} caption={`${topCourse?.enrollments ?? 0} students`} accent="emerald" />
        <AiStatCard icon={Library} label="Catalog Courses" value={String(courses.length)} caption="programs in catalog" accent="amber" />
      </div>

      {/* Students by course (real dropout distribution) */}
      <Card className="flex h-full flex-col">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Students by Course</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Per-course student counts from the Student Dropout Dataset
          </p>
        </div>
        <div className="mt-4 h-64" role="img" aria-label="Students by course chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCourse} margin={{ top: 5, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: colors.tick, fontSize: 10 }} tickLine={false} axisLine={false} dy={6} interval={0} />
              <YAxis tick={{ fill: colors.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={34} allowDecimals={false} />
              <Tooltip
                contentStyle={{ ...colors.tooltip, borderRadius: 10, border: `1px solid ${colors.tooltip.border}`, fontSize: 12 }}
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
              />
              <Bar dataKey="students" name="Students" fill="#7c3aed" radius={[3, 3, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Course cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course, index) => (
          <Card
            key={course.id}
            padding={false}
            className="group relative flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400/30"
          >
            <CourseCardImage index={index} />
            <div className="flex flex-1 flex-col p-5">
              <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900 dark:text-white">
                {course.name}
              </h3>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Metric label="Students" value={course.enrollments.toLocaleString()} />
                <Metric label="Conversion" value={course.conversion === undefined ? 'N/A' : `${course.conversion}%`} />
                <Metric label="Revenue" value={course.revenue ?? 'N/A'} />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Student volume</span>
                  <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {course.enrollments}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400"
                    style={{ width: `${(course.enrollments / maxEnrollments) * 100}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[12px]">
                <span className="text-slate-500 dark:text-slate-400">Dataset course code</span>
                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{course.name}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Live course catalog — backend CRUD */}
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Program Catalog</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Courses stored in the EDTECH AI database — add, edit and manage program offerings.
        </p>
        <div className="mt-4">
          <CourseCatalog />
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white/[0.03] px-2.5 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-[14px] font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function CoursesSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading course intelligence">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}

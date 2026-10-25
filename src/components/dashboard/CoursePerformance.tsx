import { ArrowRight, BookOpen, Inbox, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import type { CoursePerformanceItem } from '@/types/dashboard'

export function CoursePerformance({ courses }: { courses: CoursePerformanceItem[] }) {
  const maxEnrollments = Math.max(...courses.map((course) => course.enrollments), 1)

  return (
    <Card padding={false} className="flex h-full flex-col overflow-hidden">
      <CardImageHeader
        src="/images/courses-tech.jpg"
        alt="Students in a technology classroom using computers"
        label="Courses"
        icon={BookOpen}
      />
      <div className="flex flex-1 flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
            Top Performing Courses
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enrollments, conversion and revenue this cycle
          </p>
        </div>
        <Link
          to="/courses"
          className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          View courses
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {courses.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="INSUFFICIENT DATA"
          description="This metric will become available when the required dataset is connected."
        />
      )}

      <div className="mt-4 flex-1 space-y-4">
        {courses.map((course) => {
          const isUp = (course.trend ?? 0) >= 0
          return (
            <div key={course.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                  {course.name}
                </p>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
                    isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                  )}
                  title="Week-over-week trend"
                >
                  {course.trend === undefined ? (
                    '—'
                  ) : (
                    <>
                      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isUp ? '+' : ''}
                      {course.trend}%
                    </>
                  )}
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-3">
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5"
                  role="img"
                  aria-label={`${course.enrollments} enrollments for ${course.name}`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-500"
                    style={{ width: `${(course.enrollments / maxEnrollments) * 100}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-[11.5px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                  {course.enrollments}
                </span>
              </div>

              <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Conv. <span className="font-semibold text-slate-600 dark:text-slate-300">{course.conversion === undefined ? '—' : `${course.conversion}%`}</span></span>
                <span>Revenue <span className="font-semibold text-slate-600 dark:text-slate-300">{course.revenue ?? '—'}</span></span>
                <span>Enrolled <span className="font-semibold text-slate-600 dark:text-slate-300">{course.enrollments}</span></span>
              </div>
            </div>
          )
        })}
      </div>
      </div>
    </Card>
  )
}

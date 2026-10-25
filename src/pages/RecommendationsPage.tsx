import { useCallback, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, GraduationCap, Loader2, RefreshCw, Sparkles, Users, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AiServiceStatusCard } from '@/components/ai/AiServiceStatusCard'
import { AiStatCard } from '@/components/ai/AiStatCard'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/common/Skeleton'
import { useAiService } from '@/hooks/useAiService'
import { useAsyncData } from '@/hooks/useAsyncData'
import { recommendCourses } from '@/services/apiClient'
import { listStudents, listCourses, getCourseDemand } from '@/services/crmApi'
import type { CourseDemandItem } from '@/services/crmApi'
import type { CourseRecommendationResult } from '@/types/ai'

type RecPhase =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; results: CourseRecommendationResult[] }
  | { phase: 'error'; error: string }

type DemandPhase =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; courses: CourseDemandItem[]; interests: Array<{ course: string; count: number }> }
  | { phase: 'error'; error: string }

const fmtInt = (n: number): string => Math.round(n).toLocaleString('en-US')

export function RecommendationsPage() {
  const courseFetcher = useCallback(() => listCourses({ pageSize: 50 }), [])
  const { data: courseData, loading: coursesLoading, error: coursesError, retry: coursesRetry } = useAsyncData(courseFetcher)
  const ai = useAiService()

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Course Intelligence"
        title="AI Course Recommendations"
        description="Match every student with the right learning path — powered by real data."
      />

      <PageBanner
        src="/images/recommendations.jpg"
        alt="University students in a classroom discussion with their professor"
        label="AI Course Recommendations"
        icon={Sparkles}
        caption="Every student matched with the right learning path, personalized by the live model."
      />

      {coursesLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : coursesError ? (
        <ErrorState message={coursesError ?? undefined} onRetry={coursesRetry} />
      ) : !courseData || courseData.items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses available"
          description="Create some courses first, then come back to see AI recommendations."
          className="py-20"
        />
      ) : (
        <div className="space-y-6">
          <AiServiceStatusCard status={ai.status} detail={ai.detail} baseUrl={ai.baseUrl} onRetry={ai.retry} />

          {/* Recommendation panel */}
          {ai.status === 'connected' && <RecommendationPanel />}

          {/* Course Demand Analysis */}
          <CourseDemandPanel />

          {/* Course catalog summary */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AiStatCard icon={BookOpen} label="Active Courses" value={fmtInt(courseData.items.length)} caption="in the catalog" accent="violet" />
            <AiStatCard icon={Users} label="Total Courses" value={fmtInt(courseData.total)} caption="all time" accent="emerald" />
            <AiStatCard icon={GraduationCap} label="Categories" value={String(new Set(courseData.items.map((c) => c.category)).size)} caption="unique categories" accent="amber" />
            <AiStatCard icon={Sparkles} label="Personalized Recs" value={ai.status === 'connected' ? 'Live' : 'N/A'} caption={ai.status === 'connected' ? 'from the live recommendation service' : 'awaiting AI service connection'} accent={ai.status === 'connected' ? 'violet' : 'slate'} />
          </div>

          <Link
            to="/courses"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-800 transition-all duration-200 hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-indigo-200"
          >
            View Full Catalog
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </>
  )
}

/** Personalized recommendations from the live AI API using real student data. */
function RecommendationPanel() {
  const studentsFetcher = useCallback(() => listStudents({ pageSize: 50 }), [])
  const students = useAsyncData(studentsFetcher)
  const [studentId, setStudentId] = useState('')
  const [state, setState] = useState<RecPhase>({ phase: 'idle' })

  const studentList = students.data?.items ?? []
  const selectedStudent = useMemo(
    () => studentList.find((s) => s.id === studentId) ?? studentList[0] ?? null,
    [studentList, studentId],
  )

  const generate = useCallback(async () => {
    if (!selectedStudent) return
    setState({ phase: 'loading' })
    try {
      const res = await recommendCourses({
        student: {
          id: selectedStudent.id,
          course: selectedStudent.interests,
          gender: null,
          age: null,
          admissionGrade: 65,
          scholarship: null,
          attendance: null,
        },
        topK: 5,
      })
      setState({ phase: 'done', results: res.recommendations ?? [] })
    } catch (err) {
      setState({ phase: 'error', error: err instanceof Error ? err.message : 'AI service is currently unavailable.' })
    }
  }, [selectedStudent])

  const results = state.phase === 'done' ? state.results : []

  return (
    <Card className="border-indigo-400/20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Personalized Recommendations</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real student profile → live recommendation model
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="rec-student" className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
              Select Student
            </label>
            {students.loading ? (
              <Skeleton className="h-9 w-48 rounded-lg" />
            ) : students.error || !studentList.length ? (
              <span className="text-[12px] text-slate-500">No students available.</span>
            ) : (
              <select
                id="rec-student"
                value={selectedStudent?.id ?? ''}
                onChange={(e) => setStudentId(e.target.value)}
                className="h-9 max-w-[260px] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-[12.5px] font-medium text-slate-800 outline-none transition-colors hover:border-indigo-400/50 hover:bg-indigo-50/40 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              >
                {studentList.slice(0, 50).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.interests ?? 'no interests'}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={generate} disabled={state.phase === 'loading' || !selectedStudent}>
          {state.phase === 'loading' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" /> Generate recommendations</>
          )}
        </Button>
      </div>

      {state.phase === 'loading' && (
        <div className="mt-4 space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      )}

      {state.phase === 'error' && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3 dark:border-rose-400/25 dark:bg-rose-500/[0.07]">
          <p className="text-[13px] font-semibold text-rose-800 dark:text-rose-200">Recommendation failed</p>
          <p className="mt-0.5 text-[12.5px] text-rose-700 dark:text-rose-300">{state.error}</p>
          <Button variant="secondary" size="sm" className="mt-2.5" onClick={generate}><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((rec) => (
            <div
              key={`${rec.courseCode}-${rec.rank}`}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/50 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-violet-400/40 dark:hover:bg-violet-500/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                  Rank #{rec.rank}
                </span>
                {Number.isFinite(rec.score) && (
                  <span className="tabular-nums text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
                    {rec.score < 1 ? `${(rec.score * 100).toFixed(0)}%` : Math.round(rec.score).toLocaleString('en-US')}
                  </span>
                )}
              </div>
              <p className="mt-2.5 text-[14px] font-semibold text-slate-900 dark:text-white">{rec.courseCode}</p>
              <p className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                {Number.isFinite(rec.score) ? `Score ${rec.score < 1 ? rec.score.toFixed(3) : Math.round(rec.score)}` : 'No score returned'}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/** Course demand analysis from real enrollment and lead data. */
function CourseDemandPanel() {
  const [state, setState] = useState<DemandPhase>({ phase: 'idle' })

  const runAnalysis = useCallback(async () => {
    setState({ phase: 'loading' })
    try {
      const res = await getCourseDemand()
      setState({ phase: 'done', courses: res.courses, interests: res.interest_distribution })
    } catch (err) {
      setState({ phase: 'error', error: err instanceof Error ? err.message : 'Could not analyze course demand.' })
    }
  }, [])

  const courses = state.phase === 'done' ? state.courses : []
  const interests = state.phase === 'done' ? state.interests : []
  const maxEnrollments = Math.max(...courses.map((c) => c.enrollments), 1)
  const maxInterest = Math.max(...interests.map((i) => i.count), 1)

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Course Demand Analysis</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Real enrollment and lead interest data</p>
        </div>
        <Button variant="secondary" size="sm" onClick={runAnalysis} disabled={state.phase === 'loading'}>
          {state.phase === 'loading' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</>
          ) : state.phase === 'done' ? (
            <><RefreshCw className="h-3.5 w-3.5" /> Refresh</>
          ) : (
            <><TrendingUp className="h-3.5 w-3.5" /> Analyze demand</>
          )}
        </Button>
      </div>

      {state.phase === 'loading' && (
        <div className="mt-4 space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
        </div>
      )}

      {state.phase === 'error' && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3 text-[13px] text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/[0.07] dark:text-rose-300">
          {state.error}
          <Button variant="secondary" size="sm" className="mt-2" onClick={runAnalysis}><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
        </div>
      )}

      {state.phase === 'done' && (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* Course enrollment bar chart */}
          <div>
            <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Enrollments by Course</h3>
            <ul className="mt-3 space-y-2.5">
              {courses.map((c) => (
                <li key={c.id}>
                  <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.title}</span>
                    <span className="tabular-nums text-slate-500">{c.enrollments} enrolled · demand {c.demand_score}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400" style={{ width: `${(c.enrollments / maxEnrollments) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Lead interest distribution */}
          <div>
            <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Lead Interest by Course</h3>
            {interests.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {interests.map((i) => (
                  <li key={i.course}>
                    <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{i.course}</span>
                      <span className="tabular-nums text-slate-500">{i.count} leads</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400" style={{ width: `${(i.count / maxInterest) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12.5px] text-slate-500">No course interest data from leads yet.</p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

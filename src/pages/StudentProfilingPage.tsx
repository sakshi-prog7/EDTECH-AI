import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, GraduationCap, Inbox, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/Skeleton'
import { useAiService } from '@/hooks/useAiService'
import { useAsyncData } from '@/hooks/useAsyncData'
import { profileStudent } from '@/services/apiClient'
import { listStudents } from '@/services/crmApi'
import type { StudentProfileResponse } from '@/types/ai'
import type { StudentRecord } from '@/services/crmApi'

export function StudentProfilingPage() {
  const fetcher = useCallback(() => listStudents({ pageSize: 50 }), [])
  const { data, loading, error, retry } = useAsyncData(fetcher)
  const ai = useAiService()
  const [searchParams] = useSearchParams()
  const studentId = searchParams.get('student')

  if (loading) return <ProfileSkeleton />
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={retry} />

  const studentList = data.items
  const student = studentList.find((s) => s.id === studentId) ?? null

  if (!student) {
    return (
      <>
        <BackLink />
        <Card className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
            <Inbox className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">No student selected</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Open a student profile from the Students page to see their profile here.
          </p>
          <Link
            to="/students"
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-800 transition-all hover:border-indigo-400/40 hover:bg-indigo-500/10"
          >
            View Students
          </Link>
        </Card>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Profile header */}
      <Card padding={false} className="relative overflow-hidden">
        <CardImageHeader
          src="/images/students-laptops.jpg"
          alt="Students studying with laptops and books in a library"
          label="Student Profile"
          icon={GraduationCap}
          heightClass="h-28 sm:h-32"
        />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                  {student.name}
                </h1>
                <Badge variant="info" dot>
                  Student
                </Badge>
              </div>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                {student.email ?? 'No email'} · EDTECH AI Database
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
      {/* AI intelligence */}
      <Card className="relative overflow-hidden">
        <div className="relative">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">
            <Sparkles className="h-3 w-3" />
            AI Intelligence
          </p>
          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">AI Profile Score</p>
            {ai.status === 'checking' && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/[0.03] px-3.5 py-2.5 text-[13px] font-medium text-slate-500 dark:border-white/10 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking AI service…
              </div>
            )}
            {ai.status === 'unavailable' && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[13px] font-medium text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
                  AI service connection required
                </div>
                <Button variant="secondary" size="sm" onClick={ai.retry}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            )}
            {ai.status === 'connected' && <StudentAiScore student={student} />}
          </div>
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/[0.03] px-3.5 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Recommended next action
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-slate-800 dark:text-slate-200">
                {ai.status === 'connected'
                  ? 'Provided by the live student-profiling service below.'
                  : 'Connect the AI backend to see profile analysis and recommendations.'}
              </p>
            </div>
          </div>
        </div>
      </Card>

        {/* Student information */}
        <Card className="relative overflow-hidden">
          <div className="relative">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Student Information
            </h2>
            <dl className="mt-4 space-y-4">
              <InfoRow label="Name" value={student.name} />
              <InfoRow label="Email" value={student.email ?? '—'} />
              <InfoRow label="Phone" value={student.phone ?? '—'} />
              <InfoRow label="Academic Level" value={student.academic_level ?? '—'} />
              <InfoRow label="Interests" value={student.interests ?? '—'} />
              <InfoRow label="Created" value={student.created_at ? new Date(student.created_at).toLocaleDateString() : '—'} />
            </dl>
          </div>
        </Card>
      </div>
    </div>
  )
}

/** Fetches the student profile score from the live AI API. */
function StudentAiScore({ student }: { student: StudentRecord }) {
  const [state, setState] = useState<{
    phase: 'loading' | 'done' | 'error'
    result?: StudentProfileResponse
    error?: string
  }>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ phase: 'loading' })
    profileStudent({
      student: {
        id: student.id,
        course: student.interests,
        gender: null,
        age: null,
        admissionGrade: 65,
        scholarship: null,
        attendance: null,
        maritalStatus: null,
      },
    })
      .then((result) => {
        if (!cancelled) setState({ phase: 'done', result })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            phase: 'error',
            error: err instanceof Error ? err.message : 'AI service is currently unavailable.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [student.id, attempt])

  if (state.phase === 'loading') {
    return (
      <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/[0.03] px-3.5 py-2.5 text-[13px] font-medium text-slate-500 dark:border-white/10 dark:text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Scoring student…
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-[13px] font-medium text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-300">
          {state.error}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  const { result } = state
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3.5 py-2.5 text-[15px] font-bold tabular-nums text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-200">
        {result?.score !== undefined && Number.isFinite(result.score)
          ? result.score < 1
            ? `${(result.score * 100).toFixed(0)}%`
            : Math.round(result.score).toLocaleString('en-US')
          : 'No score returned'}
      </div>
      {result?.risk && <Badge variant={riskVariant(result.risk)}>{result.risk}</Badge>}
      {result?.category && (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {result.category}
        </span>
      )}
      {result?.recommendedAction && (
        <span className="text-[12px] text-slate-500 dark:text-slate-400">{result.recommendedAction}</span>
      )}
    </div>
  )
}

function riskVariant(risk: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (risk === 'Low') return 'success'
  if (risk === 'Medium') return 'warning'
  if (risk === 'High') return 'danger'
  return 'neutral'
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/students"
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:text-slate-400"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Students
    </Link>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading student profile">
      <Skeleton className="h-5 w-32 rounded-lg" />
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  )
}

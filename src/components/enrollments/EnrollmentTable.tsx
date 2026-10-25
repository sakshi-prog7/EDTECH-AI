import { useEffect, useState } from 'react'
import { ArrowRight, GraduationCap, Plus } from 'lucide-react'

import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Modal } from '@/components/common/Modal'
import { PaginationBar } from '@/components/common/PaginationBar'
import { SelectInput } from '@/components/common/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { SearchInput } from '@/components/ui/SearchInput'
import { Skeleton } from '@/components/common/Skeleton'
import { useApiList } from '@/hooks/useApiList'
import { createEnrollment, listCourses, listEnrollments, listLeads, transitionEnrollment } from '@/services/crmApi'
import type { CourseRecord, EnrollmentRecord, LeadRecord } from '@/services/crmApi'
import { ApiError } from '@/services/authApi'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  lead: 'info',
  qualified: 'brand',
  application: 'warning',
  enrolled: 'success',
}

const STAGE_ORDER = ['lead', 'qualified', 'application', 'enrolled']

const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function EnrollmentTable() {
  const list = useApiList<EnrollmentRecord>(listEnrollments, { pageSize: 10 })
  const [advanceTarget, setAdvanceTarget] = useState<EnrollmentRecord | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdvance = async () => {
    if (!advanceTarget) return
    const current = STAGE_ORDER.indexOf(advanceTarget.status)
    const next = STAGE_ORDER[current + 1]
    if (!next) return
    setBusy(true)
    setError(null)
    try {
      await transitionEnrollment(advanceTarget.id, next)
      setAdvanceTarget(null)
      list.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not advance this enrollment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card padding={false} className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5 dark:border-white/10">
          <div className="w-full sm:w-72">
            <SearchInput
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Search lead or course…"
              aria-label="Search enrollments"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <SelectInput
              id="enrollment-status-filter"
              label="Status"
              options={[{ value: '', label: 'All stages' }, ...STAGE_ORDER.map((s) => ({ value: s, label: s }))]}
              value={list.filters.status ?? ''}
              onChange={(e) => list.setFilter({ status: e.target.value || undefined })}
              className="h-8 w-40 text-[12px]"
            />
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Enrollment
            </Button>
          </div>
        </div>

        {error && (
          <p className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        {list.error ? (
          <div className="p-5">
            <ErrorState message={list.error} onRetry={list.refresh} />
          </div>
        ) : list.loading && list.items.length === 0 ? (
          <Skeleton className="m-5 h-80 rounded-xl" />
        ) : list.items.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No enrollments found"
            description="Add an enrollment or adjust the filters."
            className="py-16"
          >
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)} className="mt-3">
              <Plus className="h-3.5 w-3.5" />
              Add Enrollment
            </Button>
          </EmptyState>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[780px] text-left text-[13px]">
                <caption className="sr-only">Enrollments from the EDTECH AI database</caption>
                <thead>
                  <tr className="border-y border-slate-200 bg-white/[0.02] dark:border-white/10">
                    {['Lead / Student', 'Course', 'Stage', 'Applied', 'Enrolled', ''].map((col) => (
                      <th key={col} scope="col" className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {list.items.map((enrollment) => {
                    const stageIndex = STAGE_ORDER.indexOf(enrollment.status)
                    const canAdvance = stageIndex >= 0 && stageIndex < STAGE_ORDER.length - 1
                    return (
                      <tr key={enrollment.id} className="transition-colors duration-200 hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]">
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{enrollment.lead_name || '—'}</p>
                          <p className="text-[11px] text-slate-500">Lead record</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-700 dark:text-slate-300">
                          {enrollment.course_title || '—'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <Badge variant={STATUS_VARIANT[enrollment.status] ?? 'neutral'} dot>
                            {enrollment.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 dark:text-slate-400">
                          {fmtDate(enrollment.applied_at)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 dark:text-slate-400">
                          {fmtDate(enrollment.enrollment_date)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          {canAdvance ? (
                            <button
                              type="button"
                              onClick={() => setAdvanceTarget(enrollment)}
                              className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                            >
                              Advance
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-[11.5px] font-medium text-slate-400">Final stage</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-white/5 md:hidden">
              {list.items.map((enrollment) => (
                <li key={enrollment.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
                        {enrollment.lead_name || '—'}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">{enrollment.course_title || ''}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[enrollment.status] ?? 'neutral'}>{enrollment.status}</Badge>
                  </div>
                  {STAGE_ORDER.indexOf(enrollment.status) < STAGE_ORDER.length - 1 && (
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => setAdvanceTarget(enrollment)}>
                      Advance stage
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>

            <PaginationBar page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
          </>
        )}
      </Card>

      {/* Advance confirm */}
      <Modal
        open={advanceTarget !== null}
        onClose={() => setAdvanceTarget(null)}
        title="Advance enrollment stage?"
        description={`Move "${advanceTarget?.lead_name ?? 'this lead'}" from "${advanceTarget?.status ?? ''}" to the next stage. The lead's status is updated to match.`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAdvanceTarget(null)} disabled={busy}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAdvance} disabled={busy}>
              {busy ? 'Advancing…' : 'Advance'}
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          Advancing updates both the enrollment stage and the linked lead's status, keeping the pipeline in sync.
        </p>
      </Modal>

      <CreateEnrollmentModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); list.refresh() }} />
    </>
  )
}

function CreateEnrollmentModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [leadId, setLeadId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [status, setStatus] = useState('lead')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [courses, setCourses] = useState<CourseRecord[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    Promise.all([listLeads({ pageSize: 100 }), listCourses({ pageSize: 100 })])
      .then(([leadRes, courseRes]) => {
        if (!cancelled) {
          setLeads(leadRes.items)
          setCourses(courseRes.items)
        }
      })
      .catch(() => {
        /* dropdown stays empty — user gets a validation error on submit */
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!leadId) e.leadId = 'Select a lead.'
    if (!courseId) e.courseId = 'Select a course.'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setBusy(true)
    try {
      await createEnrollment({ leadId, courseId, status })
      onSaved()
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add enrollment"
      description="Link a lead to a course to start the enrollment funnel."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Create enrollment'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errors.form && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {errors.form}
          </p>
        )}
        <SelectInput
          id="enrollment-lead"
          label="Lead"
          required
          options={[{ value: '', label: 'Select a lead…' }, ...leads.map((l) => ({ value: l.id, label: `${l.name} (${l.status})` }))]}
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
          error={errors.leadId}
        />
        <SelectInput
          id="enrollment-course"
          label="Course"
          required
          options={[{ value: '', label: 'Select a course…' }, ...courses.map((c) => ({ value: c.id, label: `${c.title} (${c.code})` }))]}
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          error={errors.courseId}
        />
        <SelectInput
          id="enrollment-status"
          label="Starting stage"
          options={STAGE_ORDER.map((s) => ({ value: s, label: s }))}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>
    </Modal>
  )
}


import { useState } from 'react'
import { BookOpen, Pencil, Plus, Trash2, Users } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PaginationBar } from '@/components/common/PaginationBar'
import { SelectInput } from '@/components/common/FormField'
import { CourseFormModal } from '@/components/courses/CourseFormModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { SearchInput } from '@/components/ui/SearchInput'
import { Skeleton } from '@/components/common/Skeleton'
import { useApiList } from '@/hooks/useApiList'
import { deleteCourse, listCourses } from '@/services/crmApi'
import type { CourseRecord } from '@/services/crmApi'

const fmtMoney = (n: number): string => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

const COURSE_CATEGORIES = ['Data Science', 'Artificial Intelligence', 'Programming', 'Business', 'Marketing', 'Finance', 'Computer Science', 'Psychology']

export function CourseCatalog() {
  const { user } = useAuth()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'COUNSELOR' || user?.role === 'ADMISSIONS'
  const list = useApiList<CourseRecord>(listCourses, { pageSize: 10 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CourseRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CourseRecord | null>(null)
  const [busy, setBusy] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await deleteCourse(deleteTarget.id)
      setDeleteTarget(null)
      list.refresh()
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
              placeholder="Search code or course title…"
              aria-label="Search courses"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <SelectInput
              id="course-category-filter"
              label="Category"
              options={[{ value: '', label: 'All categories' }, ...COURSE_CATEGORIES.map((c) => ({ value: c, label: c }))]}
              value={list.filters.category ?? ''}
              onChange={(e) => list.setFilter({ category: e.target.value || undefined })}
              className="h-8 w-40 text-[12px]"
            />
            {canEdit && (
              <Button variant="primary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="h-3.5 w-3.5" />
                Add Course
              </Button>
            )}
          </div>
        </div>

        {list.error ? (
          <div className="p-5">
            <ErrorState message={list.error} onRetry={list.refresh} />
          </div>
        ) : list.loading && list.items.length === 0 ? (
          <Skeleton className="m-5 h-80 rounded-xl" />
        ) : list.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No courses found"
            description="Add your first course or adjust the search."
            className="py-16"
          >
            <Button variant="secondary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }} className="mt-3">
              <Plus className="h-3.5 w-3.5" />
              Add Course
            </Button>
          </EmptyState>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <caption className="sr-only">Course catalog from the EDTECH AI database</caption>
                <thead>
                  <tr className="border-y border-slate-200 bg-white/[0.02] dark:border-white/10">
                    {['Course', 'Category', 'Duration', 'Fees', 'Status', ''].map((col) => (
                      <th key={col} scope="col" className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {list.items.map((course) => (
                    <tr key={course.id} className="transition-colors duration-200 hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <BookOpen className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{course.title}</p>
                            <p className="text-[11px] font-medium text-slate-500">{course.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant="brand">{course.category}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        {course.duration_weeks} weeks
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        ₹{fmtMoney(course.fees)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant={course.status === 'active' ? 'success' : 'neutral'} dot>
                          {course.status}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => { setEditing(course); setFormOpen(true) }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                              aria-label={`Edit ${course.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(course)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                              aria-label={`Delete ${course.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-white/5 md:hidden">
              {list.items.map((course) => (
                <li key={course.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{course.title}</p>
                      <p className="text-[11px] text-slate-500">{course.code} · {course.category}</p>
                    </div>
                    <Badge variant={course.status === 'active' ? 'success' : 'neutral'}>{course.status}</Badge>
                  </div>
                  <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">
                    {course.duration_weeks} weeks · ₹{fmtMoney(course.fees)}
                  </p>
                  {canEdit && (
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setEditing(course); setFormOpen(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(course)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <PaginationBar page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
          </>
        )}
      </Card>

      <CourseFormModal
        open={formOpen}
        course={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false)
          setEditing(null)
          list.refresh()
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this course?"
        description={`"${deleteTarget?.title ?? ''}" (${deleteTarget?.code ?? ''}) will be permanently removed from the catalog. Enrollments referencing it are preserved.`}
        busy={busy}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}



import { useState } from 'react'
import { Eye, GraduationCap, Pencil, Plus, Trash2, Users } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { PaginationBar } from '@/components/common/PaginationBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { SearchInput } from '@/components/ui/SearchInput'
import { Skeleton } from '@/components/common/Skeleton'
import { useApiList } from '@/hooks/useApiList'
import { listStudents, deleteStudent } from '@/services/crmApi'
import type { StudentRecord } from '@/services/crmApi'
import { ApiError } from '@/services/authApi'
import { StudentFormModal } from '@/components/students/StudentFormModal'

const fmtDate = (iso: string): string => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export function StudentTable() {
  const list = useApiList<StudentRecord>(listStudents, { pageSize: 10 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StudentRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null)
  const [detailTarget, setDetailTarget] = useState<StudentRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    setError(null)
    try {
      await deleteStudent(deleteTarget.id)
      setDeleteTarget(null)
      list.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete student.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card padding={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5 dark:border-white/10">
          <div className="w-full sm:w-72">
            <SearchInput value={list.search} onChange={(e) => list.setSearch(e.target.value)} placeholder="Search name, email or interests…" aria-label="Search students" />
          </div>
          <div className="sm:ml-auto">
            <Button variant="primary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus className="h-3.5 w-3.5" /> Add Student
            </Button>
          </div>
        </div>

        {error && (
          <p className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}

        {list.error ? (
          <div className="p-5"><ErrorState message={list.error} onRetry={list.refresh} /></div>
        ) : list.loading && list.items.length === 0 ? (
          <Skeleton className="m-5 h-80 rounded-xl" />
        ) : list.items.length === 0 ? (
          <EmptyState icon={Users} title="No students found" description="Add your first student or adjust the search." className="py-16">
            <Button variant="secondary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }} className="mt-3">
              <Plus className="h-3.5 w-3.5" /> Add Student
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <caption className="sr-only">Students from the EDTECH AI database</caption>
                <thead>
                  <tr className="border-y border-slate-200 bg-white/[0.02] dark:border-white/10">
                    {['Student', 'Contact', 'Academic Level', 'Interests', 'Created', ''].map((col) => (
                      <th key={col} scope="col" className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {list.items.map((student) => (
                    <tr key={student.id} className="transition-colors duration-200 hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <GraduationCap className="h-4 w-4" />
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <p className="text-slate-700 dark:text-slate-300">{student.email || '—'}</p>
                        <p className="text-[11px] text-slate-500">{student.phone || ''}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700 dark:text-slate-300">{student.academic_level || '—'}</td>
                      <td className="max-w-[260px] truncate px-5 py-3.5 text-slate-600 dark:text-slate-400">{student.interests || '—'}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 dark:text-slate-400">{fmtDate(student.created_at)}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => setDetailTarget(student)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700" aria-label={`View ${student.name}`}>
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => { setEditing(student); setFormOpen(true) }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700" aria-label={`Edit ${student.name}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(student)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${student.name}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-white/5 md:hidden">
              {list.items.map((student) => (
                <li key={student.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{student.name}</p>
                      <p className="truncate text-[11px] text-slate-500">{student.email || student.academic_level || ''}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="secondary" size="sm" onClick={() => setDetailTarget(student)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="secondary" size="sm" onClick={() => { setEditing(student); setFormOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(student)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[12px] text-slate-600 dark:text-slate-400">{student.interests || 'No interests recorded'}</p>
                </li>
              ))}
            </ul>

            <PaginationBar page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
          </>
        )}
      </Card>

      <StudentFormModal open={formOpen} student={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); setEditing(null); list.refresh() }} />

      {/* Detail View Modal */}
      <Modal open={detailTarget !== null} onClose={() => setDetailTarget(null)} title={detailTarget?.name ?? 'Student Details'} size="lg">
        {detailTarget && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <GraduationCap className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{detailTarget.name}</p>
                {detailTarget.email && <p className="text-[12.5px] text-slate-500">{detailTarget.email}</p>}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {[
                ['Email', detailTarget.email ?? '—'],
                ['Phone', detailTarget.phone ?? '—'],
                ['Academic Level', detailTarget.academic_level ?? '—'],
                ['Interests', detailTarget.interests ?? '—'],
                ['Created', fmtDate(detailTarget.created_at)],
                ['Updated', fmtDate(detailTarget.updated_at)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
                  <dd className="mt-0.5 text-[12.5px] font-medium text-slate-900 dark:text-slate-100" title={v}>{v}</dd>
                </div>
              ))}
            </dl>
            {detailTarget.lead_id && (
              <div className="rounded-xl border border-indigo-400/20 bg-indigo-50/60 p-4 dark:bg-indigo-500/[0.07]">
                <p className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-300">Linked Lead ID: {detailTarget.lead_id}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setDetailTarget(null); setEditing(detailTarget); setFormOpen(true) }}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={deleteTarget !== null} title="Delete this student?" description={`"${deleteTarget?.name ?? ''}" will be permanently removed. This cannot be undone.`} confirmLabel="Delete" busy={busy} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </>
  )
}

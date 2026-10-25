import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { PaginationBar } from '@/components/common/PaginationBar'
import { SelectInput, TextArea, TextInput } from '@/components/common/FormField'
import { QuickNotes } from '@/components/common/QuickNotes'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { SearchInput } from '@/components/ui/SearchInput'
import { Skeleton } from '@/components/common/Skeleton'
import { useApiList } from '@/hooks/useApiList'
import { ApiError } from '@/services/authApi'
import type { ListParams, Paginated } from '@/services/crmApi'

export interface CrmFieldDef {
  id: string
  label: string
  kind: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'textarea'
  required?: boolean
  options?: Array<{ value: string; label: string }>
  /** When set, options are fetched asynchronously from this function on modal open. */
  asyncOptions?: () => Promise<Array<{ value: string; label: string }>>
  placeholder?: string
  hint?: string
  /** Quick-select note presets shown as clickable chips above the textarea. */
  quickNotes?: string[]
}

export interface CrmColumn {
  key: string
  label: string
  render?: (item: Record<string, unknown>) => string
  /** Badge variant keyed by raw value. */
  badge?: (value: unknown) => BadgeVariant
}

interface CrmModuleProps<T extends { id: string }> {
  title: string
  description: string
  icon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  createLabel: string
  fields: CrmFieldDef[]
  columns: CrmColumn[]
  searchPlaceholder: string
  statusFilter?: { label: string; options: Array<{ value: string; label: string }> }
  listFetcher: (params: ListParams) => Promise<Paginated<T>>
  createFn: (input: Record<string, unknown>) => Promise<unknown>
  updateFn: (id: string, patch: Record<string, unknown>) => Promise<unknown>
  deleteFn?: (id: string) => Promise<unknown>
  toFormValues: (item: T) => Record<string, string>
}

/**
 * Reusable backend-driven CRM module (opportunities / tasks / meetings):
 * search, filter, pagination, create, edit, delete.
 */
export function CrmModule<T extends { id: string }>({
  icon: Icon,
  emptyTitle,
  emptyDescription,
  createLabel,
  fields,
  columns,
  searchPlaceholder,
  statusFilter,
  listFetcher,
  createFn,
  updateFn,
  deleteFn,
  toFormValues,
}: CrmModuleProps<T>) {
  const list = useApiList<T>(listFetcher, { pageSize: 10 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null)
  const [busy, setBusy] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget || !deleteFn) return
    setBusy(true)
    try {
      await deleteFn(deleteTarget.id)
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
              placeholder={searchPlaceholder}
              aria-label="Search records"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {statusFilter && (
              <SelectInput
                id="crm-status-filter"
                label="Status"
                options={[{ value: '', label: 'All statuses' }, ...statusFilter.options]}
                value={list.filters.status ?? ''}
                onChange={(e) => list.setFilter({ status: e.target.value || undefined })}
                className="h-8 w-40 text-[12px]"
              />
            )}
            <Button variant="primary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus className="h-3.5 w-3.5" />
              {createLabel}
            </Button>
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
            icon={Icon}
            title={emptyTitle}
            description={emptyDescription}
            className="py-16"
          >
            <Button variant="secondary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }} className="mt-3">
              <Plus className="h-3.5 w-3.5" />
              {createLabel}
            </Button>
          </EmptyState>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <caption className="sr-only">{createLabel} records</caption>
                <thead>
                  <tr className="border-y border-slate-200 bg-white/[0.02] dark:border-white/10">
                    {columns.map((col) => (
                      <th key={col.key} scope="col" className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {col.label}
                      </th>
                    ))}
                    <th scope="col" className="whitespace-nowrap px-5 py-2.5 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {list.items.map((item) => (
                    <tr key={item.id} className="transition-colors duration-200 hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]">
                      {columns.map((col) => {
                        const raw = (item as Record<string, unknown>)[col.key]
                        const text = col.render ? col.render(item as Record<string, unknown>) : String(raw ?? '—')
                        return (
                          <td key={col.key} className="whitespace-nowrap px-5 py-3.5 text-slate-700 dark:text-slate-300">
                            {col.badge ? (
                              <Badge variant={col.badge(raw)} dot>{text}</Badge>
                            ) : (
                              <span className={col.key === 'name' || col.key === 'title' ? 'font-semibold text-slate-900 dark:text-slate-100' : undefined}>{text}</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditing(item); setFormOpen(true) }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                            aria-label="Edit record"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {deleteFn && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                              aria-label="Delete record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-white/5 md:hidden">
              {list.items.map((item) => (
                <li key={item.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">
                        {String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).title ?? '—')}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {columns
                          .slice(1, 3)
                          .map((c) => c.render ? c.render(item as Record<string, unknown>) : String((item as Record<string, unknown>)[c.key] ?? '—'))
                          .join(' · ')}
                      </p>
                    </div>
                    {columns[1]?.badge && (
                      <Badge variant={columns[1].badge((item as Record<string, unknown>)[columns[1].key])}>
                        {columns[1].render ? columns[1].render(item as Record<string, unknown>) : String((item as Record<string, unknown>)[columns[1].key] ?? '—')}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setEditing(item); setFormOpen(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {deleteFn && (
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(item)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <PaginationBar page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
          </>
        )}
      </Card>

      <CrmFormModal
        open={formOpen}
        fields={fields}
        initial={editing ? toFormValues(editing) : null}
        onClose={() => setFormOpen(false)}
        onSubmit={async (values) => {
          if (editing) await updateFn(editing.id, values)
          else await createFn(values)
        }}
        onSaved={() => {
          setFormOpen(false)
          setEditing(null)
          list.refresh()
        }}
      />

      {deleteFn && (
        <ConfirmDialog
          open={deleteTarget !== null}
          title="Delete this record?"
          description="This record will be permanently removed. This action cannot be undone."
          busy={busy}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}

function CrmFormModal({
  open,
  fields,
  initial,
  onClose,
  onSubmit,
  onSaved,
}: {
  open: boolean
  fields: CrmFieldDef[]
  initial: Record<string, string> | null
  onClose: () => void
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  onSaved: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [asyncOpts, setAsyncOpts] = useState<Record<string, Array<{ value: string; label: string }>>>({})
  const [asyncLoading, setAsyncLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!open) return
    const init: Record<string, string> = {}
    for (const f of fields) {
      init[f.id] = initial?.[f.id] ?? ''
    }
    setValues(init)
    setErrors({})
    setSuccessMsg('')
    // Load async options
    for (const f of fields) {
      if (f.asyncOptions) {
        setAsyncLoading((prev) => ({ ...prev, [f.id]: true }))
        f.asyncOptions()
          .then((opts) => setAsyncOpts((prev) => ({ ...prev, [f.id]: opts })))
          .catch(() => setAsyncOpts((prev) => ({ ...prev, [f.id]: [] })))
          .finally(() => setAsyncLoading((prev) => ({ ...prev, [f.id]: false })))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const setValue = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }))

  const submit = async () => {
    const e: Record<string, string> = {}
    for (const f of fields) {
      if (f.required && !values[f.id]?.trim()) e[f.id] = `${f.label} is required.`
      if (f.kind === 'number' && values[f.id] && !Number.isFinite(Number(values[f.id]))) {
        e[f.id] = `${f.label} must be a number.`
      }
    }
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setBusy(true)
    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      const v = values[f.id]
      if (f.kind === 'number') payload[f.id] = v === '' ? 0 : Number(v)
      else if (f.kind === 'date') payload[f.id] = v ? `${v}T00:00:00.000Z` : null
      else if (f.kind === 'datetime') payload[f.id] = v ? new Date(v).toISOString() : null
      else payload[f.id] = v.trim() || null
    }
    try {
      await onSubmit(payload)
      setSuccessMsg(initial ? 'Record updated successfully!' : 'Record created successfully!')
      setTimeout(() => {
        onSaved()
      }, 800)
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
      title={initial ? 'Edit record' : 'Create record'}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : initial ? 'Save changes' : 'Create'}
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
        {successMsg && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            ✓ {successMsg}
          </p>
        )}
        {fields.map((f) => {
          const common = {
            key: f.id,
            label: f.label,
            required: f.required,
            error: errors[f.id],
            value: values[f.id] ?? '',
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setValue(f.id, e.target.value),
          }
          if (f.kind === 'select') {
            const opts = f.asyncOptions ? (asyncOpts[f.id] ?? []) : (f.options ?? [])
            const loading = asyncLoading[f.id] ?? false
            return (
              <SelectInput
                key={f.id}
                id={f.id}
                label={f.label}
                required={f.required}
                options={loading ? [{ value: '', label: 'Loading…' }] : opts}
                value={values[f.id] ?? ''}
                onChange={common.onChange}
                error={errors[f.id]}
                disabled={loading}
              />
            )
          }
          if (f.kind === 'textarea') {
            return (
              <div key={f.id}>
                {f.quickNotes && f.quickNotes.length > 0 && (
                  <QuickNotes options={f.quickNotes} value={values[f.id] ?? ''} onChange={(v) => setValue(f.id, v)} className="mb-2" />
                )}
                <TextArea
                  id={f.id}
                  label={f.label}
                  required={f.required}
                  placeholder={f.placeholder ?? (f.quickNotes ? 'Or type a custom note…' : undefined)}
                  value={values[f.id] ?? ''}
                  onChange={common.onChange}
                  error={errors[f.id]}
                />
              </div>
            )
          }
          return (
            <TextInput
              key={f.id}
              id={f.id}
              label={f.label}
              required={f.required}
              type={f.kind === 'number' ? 'number' : f.kind === 'datetime' ? 'datetime-local' : f.kind === 'date' ? 'date' : 'text'}
              placeholder={f.placeholder}
              hint={f.hint}
              value={values[f.id] ?? ''}
              onChange={common.onChange}
              error={errors[f.id]}
            />
          )
        })}
      </div>
    </Modal>
  )
}

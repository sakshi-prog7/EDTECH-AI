import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { PaginationBar } from '@/components/common/PaginationBar'
import { SelectInput, TextInput } from '@/components/common/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { SearchInput } from '@/components/ui/SearchInput'
import { Skeleton } from '@/components/common/Skeleton'
import { useApiList } from '@/hooks/useApiList'
import { createCampaign, deleteCampaign, duplicateCampaign, listCampaigns, sendCampaignEmails, updateCampaign } from '@/services/crmApi'
import type { CampaignRecord } from '@/services/crmApi'
import { ApiError } from '@/services/authApi'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'neutral',
  active: 'success',
  paused: 'warning',
  completed: 'info',
}

const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed']
const CAMPAIGN_TYPES = ['Email', 'Digital', 'Social', 'Event', 'Other']
const PLATFORM_OPTIONS = ['Email', 'Instagram', 'WhatsApp', 'LinkedIn', 'Facebook', 'Twitter', 'Google Ads']
const AUDIENCE_OPTIONS = [
  '12th-pass students interested in BBA',
  'Working professionals upskilling in Data Science',
  'Recent graduates exploring AI & ML',
  'IT professionals looking for Cloud Computing',
  'Marketing professionals pursuing Digital Marketing',
  'Students interested in Cybersecurity',
]

const fmtMoney = (n: number): string => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function CampaignManager() {
  const { user } = useAuth()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'ADMISSIONS'
  const canDelete = user?.role === 'ADMIN'
  const list = useApiList<CampaignRecord>(listCampaigns, { pageSize: 10 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CampaignRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CampaignRecord | null>(null)
  const [busy, setBusy] = useState(false)

  const [duplicateTarget, setDuplicateTarget] = useState<CampaignRecord | null>(null)
  const [sendTarget, setSendTarget] = useState<CampaignRecord | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await deleteCampaign(deleteTarget.id)
      setDeleteTarget(null)
      list.refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleDuplicate = async () => {
    if (!duplicateTarget) return
    setBusy(true)
    try {
      await duplicateCampaign(duplicateTarget.id)
      setDuplicateTarget(null)
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
              placeholder="Search campaigns…"
              aria-label="Search campaigns"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <SelectInput
              id="campaign-status-filter"
              label="Status"
              options={[{ value: '', label: 'All statuses' }, ...CAMPAIGN_STATUSES.map((s) => ({ value: s, label: s }))]}
              value={list.filters.status ?? ''}
              onChange={(e) => list.setFilter({ status: e.target.value || undefined })}
              className="h-8 w-40 text-[12px]"
            />
            {canEdit && (
              <Button variant="primary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
                <Plus className="h-3.5 w-3.5" />
                Create Campaign
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
            icon={Megaphone}
            title="No campaigns found"
            description="Create your first admissions campaign to start tracking outreach."
            className="py-16"
          >
            <Button variant="secondary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }} className="mt-3">
              <Plus className="h-3.5 w-3.5" />
              Create Campaign
            </Button>
          </EmptyState>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <caption className="sr-only">Campaigns from the EDTECH AI database</caption>
                <thead>
                  <tr className="border-y border-slate-200 bg-white/[0.02] dark:border-white/10">
                    {['Campaign', 'Type', 'Platform', 'Status', 'Audience', 'Budget', 'Dates', ''].map((col) => (
                      <th key={col} scope="col" className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {list.items.map((campaign) => (
                    <tr key={campaign.id} className="transition-colors duration-200 hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <Megaphone className="h-4 w-4" />
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{campaign.name}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant="brand">{campaign.type}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        {campaign.platform || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant={STATUS_VARIANT[campaign.status] ?? 'neutral'} dot>
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        {campaign.audience || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        ₹{fmtMoney(campaign.budget)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[12px] text-slate-500 dark:text-slate-400">
                        {campaign.starts_at ? fmtDate(campaign.starts_at) : '—'}
                        {campaign.ends_at ? ` → ${fmtDate(campaign.ends_at)}` : ''}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => { setEditing(campaign); setFormOpen(true) }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                              aria-label={`Edit ${campaign.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDuplicateTarget(campaign)}
                              title="Duplicate"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSendTarget(campaign)}
                              title="Send emails"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(campaign)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                                aria-label={`Delete ${campaign.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
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
              {list.items.map((campaign) => (
                <li key={campaign.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{campaign.name}</p>
                      <p className="text-[11px] text-slate-500">{campaign.type} · {campaign.platform || '—'}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[campaign.status] ?? 'neutral'}>{campaign.status}</Badge>
                  </div>
                  <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">
                    Budget ₹{fmtMoney(campaign.budget)}
                    {campaign.audience ? ` · ${campaign.audience}` : ''}
                  </p>
                  {canEdit && (
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setEditing(campaign); setFormOpen(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      {canDelete && (
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(campaign)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <PaginationBar page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
          </>
        )}
      </Card>

      <CampaignFormModal
        open={formOpen}
        campaign={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false)
          setEditing(null)
          list.refresh()
        }}
      />

      <CampaignSendModal
        open={sendTarget !== null}
        campaign={sendTarget}
        onClose={() => setSendTarget(null)}
        onSent={() => { setSendTarget(null); list.refresh() }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this campaign?"
        description={`"${deleteTarget?.name ?? ''}" will be permanently removed. Daily performance rows for it are also removed.`}
        busy={busy}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={duplicateTarget !== null}
        title="Duplicate this campaign?"
        description={`A copy of "${duplicateTarget?.name ?? ''}" will be created as a draft.`}
        busy={busy}
        onConfirm={handleDuplicate}
        onClose={() => setDuplicateTarget(null)}
      />
    </>
  )
}

function CampaignFormModal({
  open,
  campaign,
  onClose,
  onSaved,
}: {
  open: boolean
  campaign: CampaignRecord | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(campaign?.name ?? 'Demo Campaign')
  const [type, setType] = useState(campaign?.type ?? 'Email')
  const [status, setStatus] = useState<string>(campaign?.status ?? 'draft')
  const [platform, setPlatform] = useState(campaign?.platform ?? '')
  const [audience, setAudience] = useState(campaign?.audience ?? '')
  const [budget, setBudget] = useState(String(campaign?.budget ?? 0))
  const [startsAt, setStartsAt] = useState(campaign?.starts_at ? campaign.starts_at.slice(0, 10) : '')
  const [endsAt, setEndsAt] = useState(campaign?.ends_at ? campaign.ends_at.slice(0, 10) : '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(campaign?.name ?? 'Demo Campaign')
    setType(campaign?.type ?? 'Email')
    setStatus(campaign?.status ?? 'draft')
    setPlatform(campaign?.platform ?? '')
    setAudience(campaign?.audience ?? '')
    setBudget(String(campaign?.budget ?? 0))
    setStartsAt(campaign?.starts_at ? campaign.starts_at.slice(0, 10) : '')
    setEndsAt(campaign?.ends_at ? campaign.ends_at.slice(0, 10) : '')
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id])

  const submit = async () => {
    const e: Record<string, string> = {}
    if (name.trim().length < 3) e.name = 'Name must be at least 3 characters.'
    const b = Number(budget)
    if (!Number.isFinite(b) || b < 0) e.budget = 'Enter a valid budget.'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setBusy(true)
    const payload: Record<string, unknown> = {
      name: name.trim(),
      type,
      status,
      platform: platform.trim() || null,
      audience: audience.trim() || null,
      budget: b,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
    }
    try {
      if (campaign) await updateCampaign(campaign.id, payload)
      else await createCampaign(payload)
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
      title={campaign ? 'Edit campaign' : 'Create campaign'}
      description={campaign ? `Update ${campaign.name}.` : 'Set up an admissions outreach campaign.'}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : campaign ? 'Save changes' : 'Create campaign'}
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
        <TextInput id="campaign-name" label="Campaign name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Spring Intake — Email Series" />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            id="campaign-type"
            label="Type"
            options={CAMPAIGN_TYPES.map((t) => ({ value: t, label: t }))}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
          <SelectInput
            id="campaign-status"
            label="Status"
            options={CAMPAIGN_STATUSES.map((s) => ({ value: s, label: s }))}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
        <SelectInput
          id="campaign-platform"
          label="Platform"
          options={[{ value: '', label: 'Select platform…' }, ...PLATFORM_OPTIONS.map((p) => ({ value: p, label: p }))]}
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        />
        <SelectInput
          id="campaign-audience"
          label="Audience"
          options={[{ value: '', label: 'Select audience…' }, ...AUDIENCE_OPTIONS.map((a) => ({ value: a, label: a }))]}
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput id="campaign-budget" label="Budget (₹)" type="number" min={0} required value={budget} onChange={(e) => setBudget(e.target.value)} error={errors.budget} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput id="campaign-start" label="Starts" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            <TextInput id="campaign-end" label="Ends" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

function CampaignSendModal({
  open,
  campaign,
  onClose,
  onSent,
}: {
  open: boolean
  campaign: CampaignRecord | null
  onClose: () => void
  onSent: () => void
}) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [recipientsText, setRecipientsText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ sent: number; total: number; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      // Parse recipients from text (one per line: email,name)
      const recipients = recipientsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [email, name] = line.split(',').map((s) => s.trim())
          return { email: email || '', name: name || 'Student' }
        })
        .filter((r) => r.email)

      if (recipients.length === 0) {
        setError('Enter at least one recipient (email per line, optional: name).')
        setBusy(false)
        return
      }

      const res = await sendCampaignEmails(campaign!.id, subject, body, recipients)
      setResult(res)
      setTimeout(onSent, 2000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send campaign emails.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Send emails — ${campaign?.name ?? ''}`} description="Compose and send personalized emails to leads." size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {result && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">✓ {result.message}</p>}
        <TextInput id="send-subject" label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Follow-up on your Data Science interest" />
        <div>
          <label htmlFor="send-body" className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">Email Body (HTML)</label>
          <textarea
            id="send-body"
            rows={6}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="<p>Dear Student,</p><p>Thank you for your interest...</p>"
            className="h-auto w-full rounded-lg border border-slate-200 bg-slate-100/70 px-3 py-2 text-[13px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-white/10"
          />
        </div>
        <div>
          <label htmlFor="send-recipients" className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">Recipients (one per line: email,name)</label>
          <textarea
            id="send-recipients"
            rows={4}
            required
            value={recipientsText}
            onChange={(e) => setRecipientsText(e.target.value)}
            placeholder="student1@example.com,Priya Sharma\nstudent2@example.edu,Rohan Patel"
            className="h-auto w-full rounded-lg border border-slate-200 bg-slate-100/70 px-3 py-2 text-[13px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-white/10"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" disabled={busy}>
            {busy ? 'Sending…' : 'Send Emails'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

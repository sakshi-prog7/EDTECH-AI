import { useEffect, useState } from 'react'
import { Eye, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react'

import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { SelectInput } from '@/components/common/FormField'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Modal } from '@/components/common/Modal'
import { PaginationBar } from '@/components/common/PaginationBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { SearchInput } from '@/components/ui/SearchInput'
import { Skeleton } from '@/components/common/Skeleton'
import { useApiList } from '@/hooks/useApiList'
import { archiveLead, getLead, listLeads, deleteLead, generateEmailAI, getNextBestAction, sendEmail } from '@/services/crmApi'
import type { LeadDetail, LeadRecord } from '@/services/crmApi'
import { ApiError } from '@/services/authApi'
import { cn } from '@/utils/cn'
import { LeadFormModal } from '@/components/leads/LeadFormModal'
import { calculateLeadScore, getNextBestAction as getLocalNextBestAction, recommendCourse, generateOutreachEmail, personalizeEmail } from '@/services/localAiEngine'
import { localEmails, localLeads } from '@/services/localStore'
import type { LocalEmail } from '@/services/localStore'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  NEW: 'info',
  CONTACTED: 'brand',
  INTERESTED: 'brand',
  DEMO_SCHEDULED: 'warning',
  QUALIFIED: 'success',
  APPLICATION: 'warning',
  ENROLLED: 'success',
  NURTURING: 'warning',
  CONVERTED: 'success',
  INACTIVE: 'neutral',
  LOST: 'danger',
}

const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
  Low: 'neutral',
  Medium: 'warning',
  High: 'danger',
}

const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'DEMO_SCHEDULED', 'QUALIFIED', 'APPLICATION', 'ENROLLED', 'NURTURING', 'CONVERTED', 'INACTIVE', 'LOST']
const LEAD_PRIORITIES = ['Low', 'Medium', 'High']

interface LeadTableProps {
  initialQuery?: string
}

export function LeadTable({ initialQuery }: LeadTableProps) {
  const list = useApiList<LeadRecord>(listLeads, { pageSize: 10 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<LeadDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LeadRecord | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<LeadRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LeadRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (initialQuery) list.setSearch(initialQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openDetail = async (lead: LeadRecord) => {
    setSelectedId(lead.id)
    setDetailLoading(true)
    setDetail(null)
    try {
      setDetail(await getLead(lead.id))
    } catch (err) {
      setDetail(null)
      setFormError(err instanceof ApiError ? err.message : 'Could not load lead details.')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedId(null)
    setDetail(null)
  }

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (lead: LeadRecord) => {
    setEditing(lead)
    setFormError(null)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await deleteLead(deleteTarget.id)
      setDeleteTarget(null)
      list.refresh()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not delete the lead.')
    } finally {
      setBusy(false)
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    setBusy(true)
    try {
      await archiveLead(archiveTarget.id)
      setArchiveTarget(null)
      list.refresh()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not archive the lead.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card padding={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5 dark:border-white/10">
          <div className="w-full sm:w-72">
            <SearchInput
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Search name, email or course…"
              aria-label="Search leads"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <SelectInput
              id="lead-status-filter"
              label="Status"
              options={[{ value: '', label: 'All statuses' }, ...LEAD_STATUSES.map((s) => ({ value: s, label: s }))]}
              value={list.filters.status ?? ''}
              onChange={(e) => list.setFilter({ status: e.target.value || undefined })}
              className="h-8 w-36 text-[12px]"
            />
            <SelectInput
              id="lead-priority-filter"
              label="Priority"
              options={[{ value: '', label: 'All priorities' }, ...LEAD_PRIORITIES.map((p) => ({ value: p, label: p }))]}
              value={list.filters.priority ?? ''}
              onChange={(e) => list.setFilter({ priority: e.target.value || undefined })}
              className="h-8 w-36 text-[12px]"
            />
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Add Lead
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
            icon={Users}
            title="No leads found"
            description="Add your first lead or adjust the search and filters."
            className="py-16"
          >
            <Button variant="secondary" size="sm" onClick={openCreate} className="mt-3">
              <Plus className="h-3.5 w-3.5" />
              Add Lead
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <caption className="sr-only">Leads from the EDTECH AI database</caption>
                <thead>
                  <tr className="border-y border-slate-200 bg-white/[0.02] dark:border-white/10">
                    {['Lead', 'Contact', 'Status', 'Priority', 'Score', 'Course Interest', 'Engagement', 'Created', ''].map((col) => (
                      <th key={col} scope="col" className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {list.items.map((lead) => (
                    <tr key={lead.id} className="transition-colors duration-200 hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{lead.name}</p>
                        <p className="text-[11px] text-slate-500">{lead.source}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <p className="text-slate-700 dark:text-slate-300">{lead.email || '—'}</p>
                        <p className="text-[11px] text-slate-500">{lead.phone || ''}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant={STATUS_VARIANT[lead.status] ?? 'neutral'} dot>{lead.status}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant={PRIORITY_VARIANT[lead.priority] ?? 'neutral'}>{lead.priority}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {lead.score !== null && lead.score !== undefined ? (
                          <span className={cn(
                            'inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                            lead.score >= 75 ? 'bg-emerald-100 text-emerald-700' : lead.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600',
                          )}>
                            {Math.round(lead.score)}
                          </span>
                        ) : <span className="text-[12px] text-slate-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        {lead.course_interest || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400" style={{ width: `${Math.max(0, Math.min(100, lead.engagement))}%` }} />
                          </div>
                          <span className="text-[11.5px] tabular-nums text-slate-600 dark:text-slate-300">{Math.round(lead.engagement)}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 dark:text-slate-400">{fmtDate(lead.created_at)}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <IconAction label="View" onClick={() => openDetail(lead)}><Eye className="h-3.5 w-3.5" /></IconAction>
                          <IconAction label="Edit" onClick={() => openEdit(lead)}><Pencil className="h-3.5 w-3.5" /></IconAction>
                          <IconAction label="Delete" danger onClick={() => setDeleteTarget(lead)}><Trash2 className="h-3.5 w-3.5" /></IconAction>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-white/5 md:hidden">
              {list.items.map((lead) => (
                <li key={lead.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{lead.name}</p>
                      <p className="truncate text-[11px] text-slate-500">{lead.email || lead.source}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[lead.status] ?? 'neutral'}>{lead.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant={PRIORITY_VARIANT[lead.priority] ?? 'neutral'}>{lead.priority}</Badge>
                    <span className="text-[11.5px] text-slate-500">{lead.course_interest || 'No course interest'} · {Math.round(lead.engagement)}% engaged</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openDetail(lead)} className="flex-1"><Eye className="h-3.5 w-3.5" /> View</Button>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(lead)}><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                </li>
              ))}
            </ul>

            <PaginationBar page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
          </>
        )}
      </Card>

      <LeadFormModal
        open={formOpen}
        lead={editing}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); setEditing(null); list.refresh() }}
      />

      <Modal open={selectedId !== null} onClose={closeDetail} title={detail?.lead.name ?? 'Lead details'} size="lg">
        {detailLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : detail ? (
          <LeadDetailView lead={detail.lead} activities={detail.activities} onEdit={() => openEdit(detail.lead)} />
        ) : (
          <p className="text-[13px] text-slate-500">Could not load this lead.</p>
        )}
      </Modal>

      <ConfirmDialog open={archiveTarget !== null} title="Archive this lead?" description={`"${archiveTarget?.name ?? ''}" will be hidden from the default lead list.`} confirmLabel="Archive" busy={busy} onConfirm={handleArchive} onClose={() => setArchiveTarget(null)} />
      <ConfirmDialog open={deleteTarget !== null} title="Delete this lead?" description={`"${deleteTarget?.name ?? ''}" will be permanently removed. This cannot be undone.`} confirmLabel="Delete" busy={busy} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </>
  )
}

function IconAction({ label, danger, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={cn('flex h-7 w-7 items-center justify-center rounded-lg border border-transparent transition-colors',
        danger ? 'text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700')}>
      {children}
    </button>
  )
}

function LeadDetailView({ lead, activities, onEdit }: { lead: LeadRecord; activities: LeadDetail['activities']; onEdit: () => void }) {
  const [aiAction, setAiAction] = useState<{ action: string; priority: string; reasoning: string } | null>(null)
  const [aiActionLoading, setAiActionLoading] = useState(false)
  const [emailGen, setEmailGen] = useState<{ subject: string; body: string } | null>(null)
  const [emailGenLoading, setEmailGenLoading] = useState(false)
  const [emailGenError, setEmailGenError] = useState<string | null>(null)
  const [emailTone, setEmailTone] = useState('professional')
  const [copied, setCopied] = useState(false)
  const [emailEditing, setEmailEditing] = useState(false)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [emailHistory, setEmailHistory] = useState<LocalEmail[]>([])
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<string | null>(null)

  // Load email history for this lead
  useEffect(() => {
    setEmailHistory(localEmails.getByLead(lead.id))
  }, [lead.id])

  // Local AI lead score for display
  const localScore = calculateLeadScore({
    id: lead.id, name: lead.name, email: lead.email, phone: lead.phone,
    source: lead.source, status: lead.status, priority: lead.priority,
    course_interest: lead.course_interest, engagement: lead.engagement,
    interactions: lead.interactions, score: lead.score, notes: lead.notes,
    last_activity: lead.last_activity, created_at: lead.created_at,
  })

  // Course recommendations
  const courseRecs = recommendCourse({
    interests: lead.course_interest || '',
    course_interest: lead.course_interest || '',
    notes: lead.notes || '',
  })

  useEffect(() => {
    if (!lead) return
    setAiActionLoading(true)
    getNextBestAction({
      status: lead.status,
      score: lead.score,
      engagement: lead.engagement,
      interactions: lead.interactions,
      courseInterest: lead.course_interest,
    }).then((r) => setAiAction(r as { action: string; priority: string; reasoning: string }))
      .catch(() => {
        // Fallback to local AI
        const local = getLocalNextBestAction({
          id: lead.id, name: lead.name, email: lead.email, phone: lead.phone,
          source: lead.source, status: lead.status, priority: lead.priority,
          course_interest: lead.course_interest, engagement: lead.engagement,
          interactions: lead.interactions, score: lead.score, notes: lead.notes,
          last_activity: lead.last_activity, created_at: lead.created_at,
        })
        setAiAction({ action: local.action, priority: local.priority, reasoning: local.reason })
      })
      .finally(() => setAiActionLoading(false))
  }, [lead])

  const handleGenerateEmail = async () => {
    setEmailGenLoading(true)
    setEmailGenError(null)
    setEmailStatus(null)
    try {
      // Try backend first
      const result = await generateEmailAI(
        lead.name,
        lead.course_interest || 'your program',
        emailTone,
        lead.score,
        lead.priority,
        lead.source,
        lead.status,
        lead.notes,
      )
      setEmailGen(result as { subject: string; body: string })
      setEditSubject((result as Record<string, unknown>).subject as string || '')
      setEditBody(((result as Record<string, unknown>).body as string || '').replace(/<[^>]*>/g, ''))
    } catch {
      // Fallback to local AI email generation
      const localEmail = generateOutreachEmail({
        id: lead.id, name: lead.name, email: lead.email, phone: lead.phone,
        source: lead.source, status: lead.status, priority: lead.priority,
        course_interest: lead.course_interest, engagement: lead.engagement,
        interactions: lead.interactions, score: lead.score, notes: lead.notes,
        last_activity: lead.last_activity, created_at: lead.created_at,
      }, emailTone)
      setEmailGen({ subject: localEmail.subject, body: localEmail.body })
      setEditSubject(localEmail.subject)
      setEditBody(localEmail.body.replace(/<[^>]*>/g, ''))
    } finally {
      setEmailGenLoading(false)
    }
  }

  const handlePersonalizeEmail = () => {
    if (!emailGen) return
    const personalized = personalizeEmail(
      { id: lead.id, name: lead.name, email: lead.email, phone: lead.phone,
        source: lead.source, status: lead.status, priority: lead.priority,
        course_interest: lead.course_interest, engagement: lead.engagement,
        interactions: lead.interactions, score: lead.score, notes: lead.notes,
        last_activity: lead.last_activity, created_at: lead.created_at },
      editSubject,
      editBody,
    )
    setEditSubject(personalized.subject)
    setEditBody(personalized.body)
    setEmailGen({ subject: personalized.subject, body: personalized.body })
  }

  const handleSaveEdits = () => {
    setEmailGen({ subject: editSubject, body: editBody })
    setEmailEditing(false)
  }

  const handleCopyEmail = () => {
    if (!emailGen) return
    const text = `Subject: ${editSubject || emailGen.subject}\n\n${(editBody || emailGen.body).replace(/<[^>]*>/g, '')}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSendEmail = async () => {
    if (!emailGen || !lead.email) return
    setSendResult(null)
    try {
      const result = await sendEmail(lead.email, editSubject || emailGen.subject, editBody || emailGen.body) as Record<string, unknown>
      // Check the actual mode from the backend response
      const mode = result?.mode as string | undefined
      const success = result?.success as boolean | undefined
      if (mode === 'dev' || mode === 'development') {
        // SMTP not configured — email was logged but not delivered
        const savedEmail = localEmails.create({
          lead_id: lead.id,
          lead_name: lead.name,
          recipient_email: lead.email,
          subject: editSubject || emailGen.subject,
          body: editBody || emailGen.body,
          status: 'demo_sent',
          tone: emailTone,
        })
        setEmailHistory(prev => [savedEmail, ...prev])
        setEmailStatus('demo_sent')
        setSendResult('Development Mode: SMTP is not configured. Email was logged locally but not delivered to real inboxes.')
      } else if (success === false) {
        // Backend reported failure
        const savedEmail = localEmails.create({
          lead_id: lead.id,
          lead_name: lead.name,
          recipient_email: lead.email,
          subject: editSubject || emailGen.subject,
          body: editBody || emailGen.body,
          status: 'failed',
          tone: emailTone,
        })
        setEmailHistory(prev => [savedEmail, ...prev])
        setEmailStatus('failed')
        setSendResult(`Failed to send email: ${result?.message || 'Unknown error'}`)
      } else {
        // Actually sent via SMTP
        const savedEmail = localEmails.create({
          lead_id: lead.id,
          lead_name: lead.name,
          recipient_email: lead.email,
          subject: editSubject || emailGen.subject,
          body: editBody || emailGen.body,
          status: 'sent',
          tone: emailTone,
        })
        setEmailHistory(prev => [savedEmail, ...prev])
        setEmailStatus('sent')
        setSendResult('Email sent successfully!')
      }
    } catch {
      // Network error or backend unavailable — save as demo
      const savedEmail = localEmails.create({
        lead_id: lead.id,
        lead_name: lead.name,
        recipient_email: lead.email,
        subject: editSubject || emailGen.subject,
        body: editBody || emailGen.body,
        status: 'demo_sent',
        tone: emailTone,
      })
      setEmailHistory(prev => [savedEmail, ...prev])
      setEmailStatus('demo_sent')
      setSendResult('Backend unavailable. Email saved in demo mode — not actually delivered.')
    }
  }

  const handleLocalSendEmail = () => {
    if (!emailGen) return
    const savedEmail = localEmails.create({
      lead_id: lead.id,
      lead_name: lead.name,
      recipient_email: lead.email || '',
      subject: editSubject || emailGen.subject,
      body: editBody || emailGen.body,
      status: 'demo_sent',
      tone: emailTone,
    })
    setEmailHistory(prev => [savedEmail, ...prev])
    setEmailStatus('demo_sent')
    setSendResult('Email saved in demo mode (SMTP not configured).')
  }

  const rows: Array<[string, string]> = [
    ['Email', lead.email ?? '—'], ['Phone', lead.phone ?? '—'], ['Source', lead.source],
    ['Course interest', lead.course_interest ?? '—'], ['Status', lead.status], ['Priority', lead.priority],
    ['Engagement', `${Math.round(lead.engagement)}%`], ['Interactions', String(lead.interactions)],
    ['Created', fmtDate(lead.created_at)], ['Last activity', fmtDate(lead.last_activity)],
  ]
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[lead.status] ?? 'neutral'} dot>{lead.status}</Badge>
            <Badge variant={PRIORITY_VARIANT[lead.priority] ?? 'neutral'}>{lead.priority}</Badge>
          </div>
          {lead.notes && <p className="mt-3 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{lead.notes}</p>}
        </div>
        <Button variant="secondary" size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
            <dd className="mt-0.5 truncate text-[12.5px] font-medium text-slate-900 dark:text-slate-100" title={v}>{v}</dd>
          </div>
        ))}
      </dl>

      {/* AI Score Card */}
      <div className="rounded-xl border border-indigo-400/20 bg-indigo-50/60 p-4 dark:bg-indigo-500/[0.07]">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-300">AI Lead Score</p>
          <span className={cn('text-[11px] font-bold uppercase px-2 py-0.5 rounded-full',
            localScore.classification === 'HOT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
            localScore.classification === 'WARM' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' :
            'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300')}>{localScore.classification}</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-[28px] font-bold tabular-nums text-slate-900 dark:text-white leading-none">{localScore.score}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">/ 100</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-400" style={{ width: `${localScore.score}%` }} />
        </div>
        {localScore.reasons.length > 0 && (
          <div className="mt-3 space-y-1">
            {localScore.reasons.slice(0, 3).map((reason, i) => (
              <p key={i} className="text-[11px] text-slate-600 dark:text-slate-400">• {reason}</p>
            ))}
          </div>
        )}
        {localScore.nextAction && (
          <p className="mt-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">→ {localScore.nextAction}</p>
        )}
      </div>

      {/* AI Next Best Action */}
      {aiAction && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-50/60 p-4 dark:bg-emerald-500/[0.07]">
          <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">AI Recommended Next Action</p>
          <p className="mt-1 text-[13px] font-medium text-slate-900 dark:text-slate-100">{aiAction.action}</p>
          {aiAction.reasoning && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{aiAction.reasoning}</p>}
        </div>
      )}
      {aiActionLoading && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
          <p className="text-[12px] text-slate-500">Loading AI recommendation…</p>
        </div>
      )}

      {/* AI Course Recommendation */}
      {courseRecs.length > 0 && (
        <div className="rounded-xl border border-sky-400/20 bg-sky-50/40 p-4 dark:bg-sky-500/[0.05]">
          <p className="text-[12px] font-semibold text-sky-700 dark:text-sky-300">🎯 AI Course Recommendation</p>
          {courseRecs.slice(0, 2).map((rec, i) => (
            <div key={rec.courseId} className="mt-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{rec.courseName}</p>
                <span className={cn('text-[11px] font-bold tabular-nums', rec.matchPercentage >= 70 ? 'text-emerald-600' : rec.matchPercentage >= 40 ? 'text-amber-600' : 'text-slate-500')}>{rec.matchPercentage}% match</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{rec.reason}</p>
              {rec.matchingSkills.length > 0 && <p className="mt-1 text-[10.5px] text-slate-400">Matching: {rec.matchingSkills.join(', ')}</p>}
              {i === 0 && rec.alternativeCourse && <p className="mt-1 text-[10.5px] text-slate-400">Alternative: {rec.alternativeCourse}</p>}
            </div>
          ))}
        </div>
      )}

      {/* AI Outreach Email Generator */}
      <div className="rounded-xl border border-violet-400/20 bg-violet-50/40 p-4 dark:bg-violet-500/[0.05]">
        <p className="text-[12px] font-semibold text-violet-700 dark:text-violet-300">✉️ AI Outreach Email</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={emailTone}
            onChange={(e) => setEmailTone(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] dark:border-white/10 dark:bg-white/5"
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="urgent">Urgent</option>
          </select>
          <Button variant="primary" size="sm" onClick={handleGenerateEmail} disabled={emailGenLoading}>
            {emailGenLoading ? 'Generating…' : 'Generate Email'}
          </Button>
          {emailGen && (
            <>
              <Button variant="secondary" size="sm" onClick={handlePersonalizeEmail}>Personalize</Button>
              <Button variant="secondary" size="sm" onClick={() => setEmailEditing(!emailEditing)}>{emailEditing ? 'Preview' : 'Edit'}</Button>
              <Button variant="secondary" size="sm" onClick={handleCopyEmail}>{copied ? 'Copied!' : 'Copy'}</Button>
              {lead.email && <Button variant="secondary" size="sm" onClick={handleSendEmail}>Send</Button>}
              {!lead.email && <Button variant="secondary" size="sm" onClick={handleLocalSendEmail}>Demo Send</Button>}
            </>
          )}
        </div>
        {emailGenError && <p className="mt-2 text-[12px] text-rose-600">{emailGenError}</p>}
        {sendResult && (
          <p className={cn('mt-2 text-[12px] font-medium',
            emailStatus === 'sent' ? 'text-emerald-600 dark:text-emerald-400' :
            emailStatus === 'demo_sent' ? 'text-amber-600 dark:text-amber-400' :
            emailStatus === 'failed' ? 'text-rose-600 dark:text-rose-400' :
            'text-slate-600 dark:text-slate-400')}>{sendResult}</p>
        )}
        {emailGen && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
            {emailEditing ? (
              <>
                <div className="mb-2">
                  <label className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Subject</label>
                  <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] dark:border-white/10 dark:bg-white/5 dark:text-slate-200" />
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Body</label>
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] dark:border-white/10 dark:bg-white/5 dark:text-slate-200" />
                </div>
                <Button variant="primary" size="sm" onClick={handleSaveEdits} className="mt-2">Save Changes</Button>
              </>
            ) : (
              <>
                <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Subject: {editSubject || emailGen.subject}</p>
                <div className="mt-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: editBody || emailGen.body }} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Email History */}
      {emailHistory.length > 0 && (
        <div>
          <h3 className="mb-2 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">📧 Email History</h3>
          <div className="space-y-2">
            {emailHistory.slice(0, 5).map((email) => (
              <div key={email.id} className="rounded-lg border border-slate-200 px-3.5 py-2.5 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">{email.subject}</p>
                  <span className={cn('text-[10px] font-semibold uppercase',
                    email.status === 'sent' ? 'text-emerald-600' :
                    email.status === 'demo_sent' ? 'text-amber-600' :
                    email.status === 'queued' ? 'text-blue-600' :
                    'text-slate-500')}>{email.status.replace('_', ' ')}</span>
                </div>
                <p className="mt-0.5 text-[10.5px] text-slate-500">To: {email.recipient_email} · {fmtDate(email.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity History */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
          <UserPlus className="h-3.5 w-3.5 text-indigo-500" /> Activity History
        </h3>
        {activities.length === 0 ? (
          <p className="text-[12.5px] text-slate-500">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {activities.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 px-3.5 py-2.5 dark:border-white/10">
                <p className="text-[12.5px] text-slate-700 dark:text-slate-300">{a.note}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{fmtDate(a.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

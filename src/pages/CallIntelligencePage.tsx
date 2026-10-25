import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Mail, Phone, PhoneCall, Plus, Trash2, CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SelectInput } from '@/components/common/FormField'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/Skeleton'
import { PaginationBar } from '@/components/common/PaginationBar'
import { TextArea, TextInput } from '@/components/common/FormField'
import { useApiList } from '@/hooks/useApiList'
import { listCalls, createCall, deleteCall, listLeads, generateEmailAI, createTask } from '@/services/crmApi'
import type { CallLog, LeadRecord } from '@/services/crmApi'
import { ApiError } from '@/services/authApi'

const SENTIMENT_VARIANT: Record<string, BadgeVariant> = {
  Positive: 'success',
  Neutral: 'info',
  Negative: 'danger',
}
const INTENT_VARIANT: Record<string, BadgeVariant> = {
  High: 'success',
  Medium: 'warning',
  Low: 'neutral',
}

const fmtDate = (iso: unknown): string =>
  iso ? new Date(String(iso)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function CallIntelligencePage() {
  const list = useApiList<CallLog>(listCalls, { pageSize: 10 })
  const [formOpen, setFormOpen] = useState(false)
  const [detail, setDetail] = useState<CallLog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CallLog | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    setError(null)
    try {
      await deleteCall(deleteTarget.id)
      setDeleteTarget(null)
      list.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete call record.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Call Intelligence"
        title="Call Intelligence"
        description="Turn every conversation into actionable admissions intelligence."
        actions={
          <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Log Call
          </Button>
        }
      />

      <PageBanner
        src="/images/call-intelligence.jpg"
        alt="A professional admissions team member speaking on the phone at a desk"
        label="Conversation Intelligence"
        icon={PhoneCall}
        caption="Every call becomes actionable admissions intelligence — transcripts, sentiment and outcomes."
      />

      <Card padding={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5 dark:border-white/10">
          <div className="w-full sm:w-72">
            <SearchInput
              value={list.search}
              onChange={(e) => list.setSearch(e.target.value)}
              placeholder="Search calls…"
              aria-label="Search calls"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Log Call
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
            icon={Phone}
            title="No calls logged yet"
            description="Log your first call transcript to see AI-powered sentiment analysis and insights."
            className="py-16"
          >
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)} className="mt-3">
              <Plus className="h-3.5 w-3.5" />
              Log Call
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <caption className="sr-only">Call logs from the EDTECH AI database</caption>
                <thead>
                  <tr className="border-y border-slate-200 bg-white/[0.02] dark:border-white/10">
                    {['Call', 'Lead', 'Sentiment', 'Buying Intent', 'Duration', 'Date', ''].map((col) => (
                      <th key={col} scope="col" className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {list.items.map((call) => (
                    <tr key={call.id} className="transition-colors duration-200 hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <PhoneCall className="h-4 w-4" />
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{call.title}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        {call.lead_name || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant={SENTIMENT_VARIANT[call.sentiment ?? ''] ?? 'neutral'}>{call.sentiment || '—'}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <Badge variant={INTENT_VARIANT[call.buying_intent ?? ''] ?? 'neutral'}>{call.buying_intent || '—'}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        {call.duration_minutes ? `${call.duration_minutes}m` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {fmtDate(call.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetail(call)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                            aria-label="View call"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(call)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Delete call"
                          >
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
              {list.items.map((call) => (
                <li key={call.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{call.title}</p>
                      <p className="text-[11px] text-slate-500">{call.lead_name || 'No linked lead'} · {call.duration_minutes ? `${call.duration_minutes}m` : '—'}</p>
                    </div>
                    <Badge variant={SENTIMENT_VARIANT[call.sentiment ?? ''] ?? 'neutral'}>{call.sentiment || '—'}</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => setDetail(call)}>
                      View Details
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(call)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <PaginationBar page={list.page} pages={list.pages} total={list.total} onPage={list.setPage} />
          </>
        )}
      </Card>

      <CallFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); list.refresh() }}
      />

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.title ?? 'Call Details'}
        size="lg"
      >
        {detail && (
          <CallDetailView call={detail} />
        )}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this call record?"
        description={`"${deleteTarget?.title ?? ''}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}

function CallDetailView({ call }: { call: CallLog }) {
  const topics = (() => { try { return JSON.parse(call.topics || '[]') } catch { return [] } })()
  const objections = (() => { try { return JSON.parse(call.objections || '[]') } catch { return [] } })()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={SENTIMENT_VARIANT[call.sentiment ?? ''] ?? 'neutral'}>{call.sentiment || 'Neutral'}</Badge>
        <Badge variant={INTENT_VARIANT[call.buying_intent ?? ''] ?? 'neutral'}>Intent: {call.buying_intent || '—'}</Badge>
        {call.duration_minutes && <Badge variant="info">{call.duration_minutes}m</Badge>}
      </div>

      {call.summary && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">Summary</h3>
          <p className="rounded-xl bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-300">{call.summary}</p>
        </div>
      )}

      {call.next_action && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">Next Best Action</h3>
          <p className="rounded-xl bg-indigo-50 p-4 text-[13px] leading-relaxed text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{call.next_action}</p>
        </div>
      )}

      {topics.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">Topics</h3>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t: string) => <Badge key={String(t)} variant="info">{String(t)}</Badge>)}
          </div>
        </div>
      )}

      {objections.length > 0 && (
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">Objections</h3>
          <ul className="list-disc pl-5 text-[13px] text-slate-600 dark:text-slate-400">
            {objections.map((o: string) => <li key={o}>{o}</li>)}
          </ul>
        </div>
      )}

      {call.counselor_name && (
        <dl className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Counselor</dt>
            <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">{call.counselor_name}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Analyzed by</dt>
            <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">{call.analyzed_by || '—'}</dd>
          </div>
        </dl>
      )}

      {/* Follow-up actions */}
      <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
        <h3 className="mb-3 text-[13px] font-semibold text-slate-700 dark:text-slate-200">Follow-up Actions</h3>
        <div className="flex flex-wrap gap-2">
          <FollowUpEmailButton call={call} />
          <FollowUpTaskButton call={call} />
        </div>
      </div>
    </div>
  )
}

function FollowUpEmailButton({ call }: { call: CallLog }) {
  const [generating, setGenerating] = useState(false)
  const navigate = useNavigate()

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await generateEmailAI(
        call.lead_name || 'Student',
        '',
        'professional',
      )
      const aiSubject = (result as Record<string, unknown>).subject as string || 'Follow-up on your inquiry'
      const aiBody = (result as Record<string, unknown>).body as string || ''
      // Strip HTML tags for the plain-text body field
      const plainBody = aiBody.replace(/<[^>]*>/g, '').trim()
      navigate('/communication', {
        state: {
          to: '',
          subject: aiSubject,
          body: plainBody,
        },
      })
    } catch {
      // If AI fails, still navigate so user can compose manually
      navigate('/communication')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button variant="primary" size="sm" onClick={handleGenerate} disabled={generating}>
      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
      Generate Follow-up Email
    </Button>
  )
}

function FollowUpTaskButton({ call }: { call: CallLog }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (busy || done) return
    setBusy(true)
    setError(null)
    try {
      const title = call.next_action
        ? call.next_action
        : `Follow up on call: ${call.title}`
      await createTask({
        title,
        lead_id: call.lead_id || null,
        priority: call.buying_intent === 'High' ? 'High' : 'Medium',
        status: 'pending',
        notes: call.summary ? `Based on call analysis: ${call.summary.substring(0, 200)}` : undefined,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Task Created
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleCreate} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Create Follow-up Task
      </Button>
      {error && <span className="text-[11px] text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  )
}

function CallFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [leadId, setLeadId] = useState('')
  const [counselorName, setCounselorName] = useState('')
  const [duration, setDuration] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [leads, setLeads] = useState<LeadRecord[]>([])

  // Load leads when modal opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    listLeads({ pageSize: 200 })
      .then((res) => { if (!cancelled) setLeads(res.items) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await createCall({
        title: title.trim(),
        transcript: transcript.trim(),
        leadId: leadId.trim() || undefined,
        counselorName: counselorName.trim() || undefined,
        durationMinutes: duration ? parseInt(duration, 10) : undefined,
      })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onSaved(); setTitle(''); setTranscript(''); setLeadId(''); setCounselorName(''); setDuration('') }, 1500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to log call.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log a Call" description="Paste a transcript and the AI will analyze it for sentiment, topics and next steps." size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">✓ Call analyzed and saved successfully!</p>}
        <TextInput id="call-title" label="Call Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Initial counseling call" />
        <SelectInput
          id="call-lead"
          label="Related Lead"
          options={[{ value: '', label: 'Select a lead…' }, ...leads.map((l) => ({ value: l.id, label: `${l.name} (${l.status})` }))]}
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput id="call-counselor" label="Counselor Name" value={counselorName} onChange={(e) => setCounselorName(e.target.value)} placeholder="e.g. Rahul Verma" />
          <TextInput id="call-duration" label="Duration (minutes)" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="25" />
        </div>
        <TextArea id="call-transcript" label="Call Transcript" required value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste or type the call transcript here. The AI will analyze sentiment, keywords, objections, buying intent and recommend next steps." />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" disabled={busy || !transcript.trim()}>
            {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</> : 'Analyze & Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

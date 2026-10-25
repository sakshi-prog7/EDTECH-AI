import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { FormEvent } from 'react'
import { Clock, Mail, PenSquare, RefreshCw, Send, CheckCircle2, XCircle, Sparkles } from 'lucide-react'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/common/Skeleton'
import { Modal } from '@/components/common/Modal'
import { TextInput } from '@/components/common/FormField'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getEmailHealth, sendEmail, generateEmailAI } from '@/services/crmApi'
import { cn } from '@/utils/cn'
import { localEmails } from '@/services/localStore'
import type { LocalEmail } from '@/services/localStore'

export function CommunicationPage() {
  const healthFetcher = useCallback(() => getEmailHealth(), [])
  const { data: health, loading, error, retry } = useAsyncData(healthFetcher)
  const location = useLocation()
  const mailState = (location.state as Record<string, string> | null) ?? null
  const [composeOpen, setComposeOpen] = useState(!!mailState)

  useEffect(() => {
    if (mailState) setComposeOpen(true)
  }, [mailState])

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Communication"
        title="Email & Communication"
        description="Manage student and lead communication from one place."
        actions={
          <Button variant="primary" size="sm" onClick={() => setComposeOpen(true)}>
            <PenSquare className="h-3.5 w-3.5" />
            Compose Email
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : error || !health ? (
        <ErrorState
          title="Could not check email service"
          message={error ?? 'The email health endpoint is not responding.'}
          onRetry={retry}
        />
      ) : (
        <div className="space-y-6">
          {/* Email service status */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Mail className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Email Service</h2>
                  <Badge variant={health.configured ? 'success' : 'warning'} dot>
                    {health.configured ? 'SMTP Configured' : 'Dev Mode'}
                  </Badge>
                </div>
                <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {health.message}
                </p>
                {health.configured && health.host && (
                  <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                    Server: <span className="font-medium">{health.host}</span> · From: <span className="font-medium">{health.from}</span>
                  </p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={retry}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </Card>

          {/* Feature cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={Send}
              title="Sending"
              text={health.configured ? 'Emails are sent via configured SMTP server.' : 'Emails are logged in dev mode (no SMTP). Configure SMTP for real delivery.'}
              active={true}
            />
            <FeatureCard
              icon={PenSquare}
              title="Compose & Preview"
              text="Compose personalized emails with AI generation from the Campaign page."
              active={true}
            />
            <FeatureCard
              icon={Clock}
              title="Campaign Tracking"
              text="Email delivery, opens and clicks are tracked per campaign."
              active={true}
            />
          </div>

          {/* Quick actions */}
          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
            <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
              Send individual emails or manage campaign communication.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" onClick={() => setComposeOpen(true)}>
                <PenSquare className="h-3.5 w-3.5" />
                Compose Email
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.location.href = '/campaigns'}>
                <Send className="h-3.5 w-3.5" />
                Email Campaigns
              </Button>
            </div>
          </Card>

          {/* Email History */}
          <EmailHistorySection />
        </div>
      )}

      <ComposeEmailModal open={composeOpen} onClose={() => setComposeOpen(false)} initialTo={mailState?.to ?? ''} initialSubject={mailState?.subject ?? ''} initialBody={mailState?.body ?? ''} />
    </>
  )
}

function FeatureCard({ icon: Icon, title, text, active }: { icon: typeof Send; title: string; text: string; active: boolean }) {
  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      active ? 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-400/20 dark:bg-indigo-500/[0.05]' : 'border-slate-200 bg-white/[0.03] dark:border-white/10',
    )}>
      <div className="flex items-center gap-2">
        <span className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          active ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        )}>
          <Icon className="h-4 w-4" />
        </span>
        {active && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      </div>
      <p className="mt-2.5 text-[13px] font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  )
}

function EmailHistorySection() {
  const [emails, setEmails] = useState<LocalEmail[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setEmails(localEmails.list())
  }, [])

  const statusVariant = (status: LocalEmail['status']): 'info' | 'warning' | 'neutral' | 'success' | 'danger' => {
    switch (status) {
      case 'sent': return 'success'
      case 'demo_sent': return 'neutral'
      case 'queued': return 'warning'
      case 'generated': return 'info'
      case 'failed': return 'danger'
    }
  }

  const statusLabel = (status: LocalEmail['status']): string => {
    switch (status) {
      case 'sent': return 'Sent'
      case 'demo_sent': return 'Demo'
      case 'queued': return 'Queued'
      case 'generated': return 'Draft'
      case 'failed': return 'Failed'
    }
  }

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Email History</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
            {emails.length === 0 ? 'No emails sent yet.' : `${emails.length} email${emails.length === 1 ? '' : 's'} logged.`}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEmails(localEmails.list())}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {emails.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-10 dark:border-white/10">
          <Mail className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-[13px] text-slate-400 dark:text-slate-500">No email history available.</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Send your first email using the compose button above.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {emails.map((email) => (
            <div
              key={email.id}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-colors hover:border-indigo-200 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-indigo-400/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                      {email.subject || '(No subject)'}
                    </p>
                    <Badge variant={statusVariant(email.status)} dot>
                      {statusLabel(email.status)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                    <span>To: <span className="font-medium text-slate-600 dark:text-slate-300">{email.recipient_email}</span></span>
                    {email.lead_name && email.lead_name !== 'Unknown' && (
                      <span>Lead: <span className="font-medium text-slate-600 dark:text-slate-300">{email.lead_name}</span></span>
                    )}
                    <span>{formatDate(email.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-300"
                >
                  {expandedId === email.id ? 'Collapse' : 'Preview'}
                </button>
              </div>
              {expandedId === email.id && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {email.body || '(Empty body)'}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                    <span>Tone: {email.tone}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function ComposeEmailModal({ open, onClose, initialTo, initialSubject, initialBody }: { open: boolean; onClose: () => void; initialTo?: string; initialSubject?: string; initialBody?: string }) {
  const [to, setTo] = useState(initialTo ?? '')
  const [subject, setSubject] = useState(initialSubject ?? '')
  const [body, setBody] = useState(initialBody ?? '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; mode?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiTone, setAiTone] = useState('professional')
  const [leadName, setLeadName] = useState('')
  const [courseInterest, setCourseInterest] = useState('')

  const handleGenerateAI = async () => {
    if (!leadName.trim()) {
      setError('Please enter a lead name to generate an email.')
      return
    }
    setAiGenerating(true)
    setError(null)
    try {
      const result = await generateEmailAI(
        leadName.trim(),
        courseInterest.trim() || 'your program',
        aiTone,
      )
      if (result) {
        setSubject(result.subject || '')
        setBody(result.body?.replace(/<[^>]*>/g, '') || '')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate email with AI.')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const htmlBody = `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6;">${body.replace(/\n/g, '<br>')}</div>`
      const response = await sendEmail(to, subject, htmlBody) as Record<string, unknown>
      const success = response.success !== false
      const mode = response.mode as string | undefined
      const message = mode === 'dev'
        ? `SMTP is not configured. Email to ${to} was not sent — it was logged in development mode.`
        : success
          ? `Email to ${to} sent successfully.`
          : `Failed to send email: ${response.error || 'Unknown error'}`
      setResult({ success: true, message, mode })
      if (success && mode !== 'dev') {
        setTimeout(() => {
          onClose()
          setTo('')
          setSubject('')
          setBody('')
          setResult(null)
        }, 2500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Compose Email" description="Send an email to a student or lead." size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3 dark:border-rose-400/25 dark:bg-rose-500/[0.07]">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="text-[12.5px] font-medium text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        )}
        {result && (
          <div className={cn(
            'flex items-start gap-2.5 rounded-xl border px-3.5 py-3',
            result.success
              ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-400/25 dark:bg-emerald-500/[0.07]'
              : 'border-amber-200 bg-amber-50/70 dark:border-amber-400/25 dark:bg-amber-500/[0.07]',
          )}>
            {result.success ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <p className={cn(
              'text-[12.5px] font-medium',
              result.success
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300',
            )}>{result.message}</p>
          </div>
        )}
        {/* AI Email Generation Section */}
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-400/20 dark:bg-violet-500/[0.05]">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-violet-700 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" /> AI Email Generator
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Enter lead details to generate a personalized email.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextInput id="ai-lead-name" label="Lead Name" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="e.g. Priya Sharma" />
            <TextInput id="ai-course" label="Course Interest" value={courseInterest} onChange={(e) => setCourseInterest(e.target.value)} placeholder="e.g. AI & ML" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <select
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] dark:border-white/10 dark:bg-white/5"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="urgent">Urgent</option>
            </select>
            <Button variant="primary" size="sm" onClick={handleGenerateAI} disabled={aiGenerating}>
              {aiGenerating ? 'Generating…' : 'Generate Email'}
            </Button>
          </div>
        </div>
        <TextInput id="email-to" label="To" type="email" required value={to} onChange={(e) => setTo(e.target.value)} placeholder="student@example.edu" />
        <TextInput id="email-subject" label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Follow-up on your application" />
        <div>
          <label htmlFor="email-body" className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">Body</label>
          <textarea
            id="email-body"
            rows={8}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Dear Student,&#10;&#10;Thank you for your interest in our program..."
            className="w-full rounded-lg border border-slate-200 bg-slate-100/70 px-3 py-2 text-[13px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-white/10"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" disabled={busy || !to.trim() || !subject.trim() || !body.trim()}>
            <Send className="h-3.5 w-3.5" />
            {busy ? 'Sending…' : 'Send Email'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

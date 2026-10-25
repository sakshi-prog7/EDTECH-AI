import { useEffect, useState } from 'react'
import { CalendarClock, Mail, Sparkles, X, Zap } from 'lucide-react'

import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { IconButton } from '@/components/common/IconButton'
import { IntentBadge, ScoreCell, nextBestAction } from '@/components/leads/LeadScore'
import { cn } from '@/utils/cn'
import type { RecentLead, RecentLeadStatus } from '@/types/dashboard'

const statusVariants: Record<RecentLeadStatus, BadgeVariant> = {
  New: 'neutral',
  Contacted: 'info',
  Qualified: 'brand',
  'Follow-up': 'warning',
  Converted: 'success',
}

interface LeadDetailDrawerProps {
  lead: RecentLead | null
  onClose: () => void
}

export function LeadDetailDrawer({ lead, onClose }: LeadDetailDrawerProps) {
  useEffect(() => {
    if (!lead) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lead, onClose])

  const action = lead ? nextBestAction(lead.score) : null

  return (
    <div
      className={cn('fixed inset-0 z-50', !lead && 'pointer-events-none')}
      inert={!lead}
      aria-hidden={!lead}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
          lead ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={lead ? `Lead details: ${lead.name}` : 'Lead details'}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 dark:border-white/10 bg-navy-900 shadow-2xl shadow-black/50 transition-transform duration-300',
          lead ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {lead && (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-white/10 p-5">
              <div className="flex items-center gap-3.5">
                <Avatar name={lead.name} size="lg" />
                <div className="leading-tight">
                  <h2 className="text-lg font-semibold tracking-tight text-white">{lead.name}</h2>
                  <div className="mt-1.5">
                    <Badge variant={statusVariants[lead.status]} dot>
                      {lead.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <IconButton label="Close lead details" onClick={onClose}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>

            {/* AI intelligence */}
            <div className="relative m-5 overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 p-5">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_100%_at_100%_0%,rgba(124,92,255,0.14),transparent_55%)]"
              />
              <div className="relative">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-300">
                  <Sparkles className="h-3 w-3" />
                  AI Intelligence
                </p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      AI Lead Score
                    </p>
                    <div className="mt-1.5">
                      <ScoreCell score={lead.score} large onDark />
                    </div>
                  </div>
                  <IntentBadge score={lead.score} onDark />
                </div>
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/[0.03] px-3.5 py-3">
                  {action && <action.icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Recommended action
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-slate-800 dark:text-slate-200">{action?.text}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead information */}
            <div className="mx-5 mb-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Lead Information
              </h3>
              <dl className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-4 text-[13px]">
                  <dt className="text-slate-500">Course Interest</dt>
                  <dd className="font-medium text-slate-100">{lead.course}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 text-[13px]">
                  <dt className="text-slate-500">Source</dt>
                  <dd className="font-medium text-slate-100">{lead.source}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 text-[13px]">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium text-slate-100">{lead.status}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 text-[13px]">
                  <dt className="text-slate-500">Last Activity</dt>
                  <dd className="flex items-center gap-1.5 font-medium text-slate-100">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                    {lead.lastActivity}
                  </dd>
                </div>
              </dl>
            </div>

            {/* AI Outreach Actions */}
            <div className="mx-5 mb-5 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Quick Actions
              </h3>
              <AiOutreachButton lead={lead} />
              <NextBestActionCard lead={lead} />
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

/** AI Outreach button — generates a personalized email for this lead. */
function AiOutreachButton({ lead }: { lead: RecentLead }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tone, setTone] = useState<string>('professional')

  const generateEmail = async () => {
    setBusy(true)
    setError(null)
    try {
      const { generateEmailAI } = await import('@/services/crmApi')
      const result = await generateEmailAI(
        lead.name,
        lead.course || 'your program',
        tone,
      )
      const data = result as Record<string, unknown>
      const subject = (data.subject as string) || `Following up on your ${lead.course} interest`
      const body = (data.body as string) || ''

      // Navigate to communication page with pre-filled email
      const params = new URLSearchParams({
        to: lead.email || '',
        subject,
        body: body.replace(/<[^>]*>/g, ''),
      })
      window.location.href = `/communication?${params.toString()}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-indigo-500"
        >
          <option value="professional">Professional Tone</option>
          <option value="friendly">Friendly Tone</option>
          <option value="urgent">Urgent Tone</option>
        </select>
        <Button
          variant="primary"
          size="sm"
          onClick={generateEmail}
          disabled={busy}
        >
          {busy ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Generating…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              AI Outreach
            </span>
          )}
        </Button>
      </div>
      {error && (
        <p className="text-[11px] text-rose-400">{error}</p>
      )}
    </div>
  )
}

/** Next Best Action card — shows AI-recommended next step. */
function NextBestActionCard({ lead }: { lead: RecentLead }) {
  const [action, setAction] = useState<{ action: string; priority: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchAction = async () => {
    setLoading(true)
    try {
      const { getNextBestAction } = await import('@/services/crmApi')
      const result = await getNextBestAction({
        status: lead.status,
        score: lead.score,
        engagement: 50,
        interactions: 3,
        courseInterest: lead.course,
      })
      setAction(result as { action: string; priority: string })
    } catch {
      // Use fallback
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    void fetchAction()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id])

  return (
    <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/[0.07] p-3.5">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-indigo-300" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
          Next Best Action
        </p>
        {loading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />}
      </div>
      {action ? (
        <div className="mt-2">
          <p className="text-[13px] leading-snug text-slate-200">{action.action}</p>
          <p className="mt-1 text-[11px] text-slate-400">Priority: {action.priority}</p>
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-slate-400">Analyzing lead context…</p>
      )}
    </div>
  )
}

import { useEffect } from 'react'
import { CircleAlert, MicOff, Phone, Sparkles, X } from 'lucide-react'

import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { IconButton } from '@/components/common/IconButton'
import { IntentBadge, nextBestAction } from '@/components/leads/LeadScore'
import { cn } from '@/utils/cn'
import type { CallRecord, CallStatus } from '@/types/calls'

const statusVariants: Record<CallStatus, BadgeVariant> = {
  Completed: 'success',
  Scheduled: 'info',
  'Follow-up': 'warning',
  Missed: 'danger',
}

const sentimentStyles: Record<CallRecord['sentiment'], string> = {
  Positive: 'text-emerald-500 dark:text-emerald-400',
  Neutral: 'text-slate-500 dark:text-slate-400',
  Negative: 'text-rose-500 dark:text-rose-400',
  'Not analyzed': 'text-slate-500 dark:text-slate-400',
}

interface CallDetailDrawerProps {
  call: CallRecord | null
  onClose: () => void
}

export function CallDetailDrawer({ call, onClose }: CallDetailDrawerProps) {
  useEffect(() => {
    if (!call) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [call, onClose])

  const action = call ? nextBestAction(call.leadScore) : null

  return (
    <div
      className={cn('fixed inset-0 z-50', !call && 'pointer-events-none')}
      inert={!call}
      aria-hidden={!call}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
          call ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={call ? `Call details: ${call.name}` : 'Call details'}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 dark:border-white/10 bg-navy-900 shadow-2xl shadow-black/50 transition-transform duration-300',
          call ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {call && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-white/10 p-5">
              <div className="flex items-center gap-3.5">
                <Avatar name={call.name} size="lg" />
                <div className="leading-tight">
                  <h2 className="text-lg font-semibold tracking-tight text-white">{call.name}</h2>
                  <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{call.course}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant={statusVariants[call.status]} dot>
                      {call.status}
                    </Badge>
                    <span className={cn('text-[11px] font-semibold', sentimentStyles[call.sentiment])}>
                      {call.sentiment}
                    </span>
                  </div>
                </div>
              </div>
              <IconButton label="Close call details" onClick={onClose}>
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
                  AI Call Intelligence
                </p>

                {/* Call score — unavailable until analysis exists */}
                <div className="mt-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    AI Call Quality Score
                  </p>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3.5 py-3">
                    <MicOff className="h-4 w-4 shrink-0 text-slate-500" />
                    <div>
                      <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Not available</p>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">
                        Call analysis data will appear when available.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Intent — derived from the existing lead score */}
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Lead Intent</p>
                    <div className="mt-1.5">
                      <IntentBadge score={call.leadScore} onDark />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Lead Score</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                      {call.leadScore}
                      <span className="ml-1 text-sm font-medium text-slate-500">/ 100</span>
                    </p>
                  </div>
                </div>

                {/* Next best action — derived from the existing lead score */}
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/[0.03] px-3.5 py-3">
                  {action && <action.icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Recommended next action
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-slate-800 dark:text-slate-200">{action?.text}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call details */}
            <div className="mx-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Call Details</h3>
              <dl className="mt-3 space-y-3">
                <DetailRow label="Counselor" value={call.counselor} />
                <DetailRow label="Date" value={`${call.date} · ${call.time}`} />
                <DetailRow label="Duration" value={call.duration === '—' ? 'Not recorded' : call.duration} />
                <DetailRow label="Outcome" value={call.outcome} />
                <DetailRow label="Sentiment" value={call.sentiment} />
              </dl>
            </div>

            {/* Conversation analysis — unavailable until backend exists */}
            <div className="mx-5 mt-5 space-y-3">
              <UnavailableBlock
                icon={Sparkles}
                title="AI Call Summary"
                message="AI summary will appear when conversation analysis is available."
              />
              <UnavailableBlock
                icon={CircleAlert}
                title="Objections Detected"
                message="Objection analysis will appear when available."
              />
              <UnavailableBlock
                icon={Phone}
                title="Conversation Transcript"
                message="Call transcript will appear when available."
              />
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-100">{value}</dd>
    </div>
  )
}

function UnavailableBlock({
  icon: Icon,
  title,
  message,
}: {
  icon: typeof Sparkles
  title: string
  message: string
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3.5 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
      <div>
        <p className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-300">{title}</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{message}</p>
      </div>
    </div>
  )
}

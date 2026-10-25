import { useCallback, useMemo, useState } from 'react'
import { Bell, BellRing, CheckCheck, GraduationCap, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Card } from '@/components/common/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/common/Skeleton'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/crmApi'
import type { NotificationRecord } from '@/services/crmApi'
import { cn } from '@/utils/cn'

const KIND_ICONS: Record<string, typeof Bell> = {
  'AI Insight': Sparkles,
  System: GraduationCap,
}

const KIND_BADGES: Record<string, BadgeVariant> = {
  'AI Insight': 'brand',
  System: 'info',
}

const iconForKind = (kind: string): typeof Bell => KIND_ICONS[kind] ?? Bell
const badgeForKind = (kind: string): BadgeVariant => KIND_BADGES[kind] ?? 'neutral'

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = Date.now()
  const diffMs = now - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Filter = 'All' | 'Unread' | string

export function NotificationsPage() {
  const navigate = useNavigate()
  const fetcher = useCallback(() => listNotifications(), [])
  const { data, loading, error, retry } = useAsyncData(fetcher)

  // IDs marked read in this session (optimistic UI, persisted via the API).
  const [readLocally, setReadLocally] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('All')

  const notifications = useMemo(() => {
    const items = data?.notifications ?? []
    return items.map((n) => (readLocally.has(n.id) ? { ...n, read: 1 } : n))
  }, [data, readLocally])

  const unreadCount = notifications.filter((n) => n.read === 0).length
  const kinds = useMemo(() => {
    const seen = new Set<string>()
    for (const n of notifications) seen.add(n.kind)
    return [...seen]
  }, [notifications])

  const visible =
    filter === 'All'
      ? notifications
      : filter === 'Unread'
        ? notifications.filter((n) => n.read === 0)
        : notifications.filter((n) => n.kind === filter)

  const handleMarkRead = async (notification: NotificationRecord) => {
    if (notification.read === 1 || busyId) return
    // Optimistic local update first.
    setReadLocally((prev) => new Set(prev).add(notification.id))
    setActionError(null)
    setBusyId(notification.id)
    try {
      await markNotificationRead(notification.id)
    } catch (err) {
      setReadLocally((prev) => {
        const next = new Set(prev)
        next.delete(notification.id)
        return next
      })
      setActionError(err instanceof Error ? err.message : 'Could not mark this notification as read.')
    } finally {
      setBusyId(null)
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return
    setActionError(null)
    setMarkingAll(true)
    const unreadIds = notifications.filter((n) => n.read === 0).map((n) => n.id)
    setReadLocally((prev) => new Set([...prev, ...unreadIds]))
    try {
      await markAllNotificationsRead()
    } catch (err) {
      setReadLocally((prev) => {
        const next = new Set(prev)
        for (const id of unreadIds) next.delete(id)
        return next
      })
      setActionError(err instanceof Error ? err.message : 'Could not mark all notifications as read.')
    } finally {
      setMarkingAll(false)
    }
  }

  const openNotification = (notification: NotificationRecord) => {
    void handleMarkRead(notification)
    if (notification.action_to) navigate(notification.action_to)
  }

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Notifications"
        title="Notifications"
        description="Stay informed about important admissions activity."
      />

      {loading ? (
        <NotificationsSkeleton />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={retry} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Real notifications will appear here as system and AI signals are generated for your account."
          className="py-20"
        />
      ) : (
        <div className="space-y-6">
          {actionError && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              {actionError}
            </p>
          )}

          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryTile icon={BellRing} label="Unread" value={String(unreadCount)} accent="violet" />
            <SummaryTile
              icon={Sparkles}
              label="AI Insights"
              value={String(notifications.filter((n) => n.kind === 'AI Insight').length)}
              accent="violet"
            />
            <SummaryTile icon={CheckCheck} label="Read" value={String(notifications.length - unreadCount)} accent="emerald" />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter notifications">
              {(['All', 'Unread', ...kinds] as Filter[]).map((tab) => {
                const count =
                  tab === 'All'
                    ? notifications.length
                    : tab === 'Unread'
                      ? unreadCount
                      : notifications.filter((n) => n.kind === tab).length
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    aria-pressed={filter === tab}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-all duration-200',
                      filter === tab
                        ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-400/50 hover:bg-indigo-50/60 hover:text-indigo-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300',
                    )}
                  >
                    {tab}
                    <span className="ml-1 tabular-nums opacity-70">{count}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markingAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors hover:border-indigo-400/50 hover:bg-indigo-50/60 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {markingAll ? 'Marking…' : 'Mark all as read'}
            </button>
          </div>

          {/* Feed */}
          <Card padding={false} className="overflow-hidden">
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {visible.map((n) => {
                const Icon = iconForKind(n.kind)
                const unread = n.read === 0
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      disabled={busyId !== null && busyId !== n.id}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]',
                        unread && 'bg-violet-500/[0.05]',
                        'disabled:cursor-wait',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                          n.kind === 'AI Insight'
                            ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/25'
                            : 'bg-indigo-500/10 text-indigo-600 dark:bg-white/[0.06] dark:text-indigo-400',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                            {n.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                            {formatWhen(n.created_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                          {n.description}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <Badge variant={badgeForKind(n.kind)}>{n.kind}</Badge>
                          {unread && (
                            <span aria-hidden="true" className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
              {visible.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  No notifications match this filter.
                </li>
              )}
            </ul>
          </Card>
        </div>
      )}
    </>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Bell
  label: string
  value: string
  accent: 'violet' | 'emerald'
}) {
  return (
    <Card className="flex items-center gap-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          accent === 'violet' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
      </div>
    </Card>
  )
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading notifications">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

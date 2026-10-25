import { ArrowRight, Eye, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import type { RecentLead, RecentLeadStatus } from '@/types/dashboard'

const statusVariants: Record<RecentLeadStatus, BadgeVariant> = {
  New: 'neutral',
  Contacted: 'info',
  Qualified: 'brand',
  'Follow-up': 'warning',
  Converted: 'success',
}

function scoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
  if (score >= 60) return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
  return 'bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-slate-300'
}

const COLUMNS = ['Lead', 'Course Interest', 'Lead Score', 'Status', 'Source', 'Last Activity', 'Action']

export function RecentLeadsTable({ leads }: { leads: RecentLead[] }) {
  return (
    <Card padding={false} className="flex h-full flex-col overflow-hidden">
      <CardImageHeader
        src="/images/leads-consultant.jpg"
        alt="An education consultant working with a smartphone and laptop in an office"
        label="Recent Leads"
        icon={Inbox}
      />
      <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Recent Leads</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Latest student leads with AI scores and status
          </p>
        </div>
        <Link
          to="/leads"
          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <caption className="sr-only">Recent leads with AI scores and pipeline status</caption>
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/70 dark:border-navy-700 dark:bg-navy-850">
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
            {leads.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-5">
                  <EmptyState
                    icon={Inbox}
                    title="No recent leads"
                    description="Recent leads will appear here once the CRM is connected."
                  />
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-navy-850/60">
                <td className="whitespace-nowrap px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={lead.name} size="sm" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{lead.name}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-600 dark:text-slate-300">
                  {lead.course}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <span
                    className={cn(
                      'inline-flex min-w-9 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                      scoreBadgeClass(lead.score),
                    )}
                  >
                    {lead.score}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <Badge variant={statusVariants[lead.status]} dot>
                    {lead.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-500 dark:text-slate-400">
                  {lead.source}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-500 dark:text-slate-400">
                  {lead.lastActivity}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <Link
                    to="/leads"
                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-[11.5px] font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-navy-700 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

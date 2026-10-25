import {
  BadgeCheck,
  BrainCircuit,
  CalendarClock,
  CalendarDays,
  FileText,
  GraduationCap,
  Inbox,
  Megaphone,
  PhoneCall,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Activity as ActivityIcon } from 'lucide-react'

import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/utils/cn'
import type { ActivityType, RecentActivityItem } from '@/types/dashboard'

const typeStyles: Record<ActivityType, { icon: LucideIcon; bg: string }> = {
  lead: { icon: UserPlus, bg: 'bg-indigo-500' },
  contact: { icon: PhoneCall, bg: 'bg-sky-500' },
  ai: { icon: BrainCircuit, bg: 'bg-violet-500' },
  followup: { icon: CalendarClock, bg: 'bg-amber-500' },
  application: { icon: FileText, bg: 'bg-slate-500' },
  meeting: { icon: CalendarDays, bg: 'bg-rose-500' },
  enrollment: { icon: BadgeCheck, bg: 'bg-emerald-500' },
  student: { icon: GraduationCap, bg: 'bg-amber-500' },
  campaign: { icon: Megaphone, bg: 'bg-pink-500' },
}

export function RecentActivity({ activities }: { activities: RecentActivityItem[] }) {
  return (
    <Card padding={false} className="flex h-full flex-col overflow-hidden">
      <CardImageHeader
        src="/images/students-collaborating.jpg"
        alt="Students collaborating with laptops in a learning space"
        label="Activity"
        icon={ActivityIcon}
      />
      <div className="flex flex-1 flex-col p-5">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Latest events across the pipeline</p>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No activity records"
          description="Activity will appear here once a real-time or row-level data source is connected."
        />
      ) : (
      <ol className="relative mt-5 flex-1 space-y-5 border-l border-slate-200 pl-5 dark:border-white/10">
        {activities.map((activity) => {
          // The live database may contain activity kinds that are not part of
          // the frontend ActivityType union (for example legacy "note" rows).
          // Always fall back instead of crashing the whole dashboard.
          const style = typeStyles[activity.type] ?? { icon: FileText, bg: 'bg-slate-500' }
          const { icon: Icon, bg } = style
          return (
            <li key={activity.id} className="relative">
              <span
                className={cn(
                  'absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full text-white ring-4 ring-white dark:ring-navy-900',
                  bg,
                )}
              >
                <Icon className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <p className="text-[13px] leading-snug text-slate-700 dark:text-slate-200">
                {activity.text}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{activity.time}</p>
            </li>
          )
        })}
      </ol>
      )}
      </div>
    </Card>
  )
}

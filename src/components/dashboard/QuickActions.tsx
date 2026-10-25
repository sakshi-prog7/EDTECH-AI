import {
  BarChart3,
  BookOpen,
  CalendarClock,
  GraduationCap,
  ListChecks,
  Mail,
  Megaphone,
  Phone,
  Sparkles,
  Target,
  UserPlus,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'

interface QuickAction {
  label: string
  to: string
  icon: LucideIcon
  color?: string
}

const ACTIONS: QuickAction[] = [
  { label: '+ Add Lead', to: '/leads', icon: UserPlus, color: 'text-violet-600 dark:text-violet-400' },
  { label: '+ Add Student', to: '/students', icon: UserRound, color: 'text-indigo-600 dark:text-indigo-400' },
  { label: 'Create Task', to: '/tasks', icon: ListChecks, color: 'text-rose-600 dark:text-rose-400' },
  { label: 'Schedule Meeting', to: '/meetings', icon: CalendarClock, color: 'text-sky-600 dark:text-sky-400' },
  { label: 'Log Call', to: '/call-intelligence', icon: Phone, color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Start Follow-up', to: '/follow-ups', icon: Mail, color: 'text-amber-600 dark:text-amber-400' },
  { label: 'Create Campaign', to: '/campaigns', icon: Megaphone, color: 'text-purple-600 dark:text-purple-400' },
  { label: 'AI Lead Scoring', to: '/ai/lead-scoring', icon: Target, color: 'text-violet-600 dark:text-violet-400' },
  { label: 'View Courses', to: '/courses', icon: BookOpen, color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Counselor Report', to: '/counselors', icon: GraduationCap, color: 'text-indigo-600 dark:text-indigo-400' },
  { label: 'AI Insights', to: '/ai-insights', icon: Sparkles, color: 'text-violet-600 dark:text-violet-400' },
  { label: 'View Reports', to: '/analytics/sales', icon: BarChart3, color: 'text-sky-600 dark:text-sky-400' },
]

export function QuickActions() {
  return (
    <Card padding={false} className="flex h-full flex-col overflow-hidden">
      <CardImageHeader
        src="/images/about-team.jpg"
        alt="A diverse education team collaborating in a modern office"
        label="Quick Actions"
        icon={Sparkles}
      />
      <div className="flex flex-1 flex-col p-5">
        <h2 className="pb-3 text-[15px] font-semibold text-slate-900 dark:text-white">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-medium text-slate-700 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
            >
              <action.icon className={`h-3.5 w-3.5 ${action.color ?? 'text-indigo-600 dark:text-indigo-400'}`} />
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  )
}

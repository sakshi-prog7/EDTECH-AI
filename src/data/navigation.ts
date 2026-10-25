import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  BrainCircuit,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  Mail,
  Megaphone,
  Phone,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'

import type { NavSection } from '@/types/navigation'

/**
 * Sidebar navigation model. Each section and item can optionally declare a
 * `roles` array — when present, only users whose role is in the array see
 * the section/item. When `roles` is omitted, the item is visible to everyone.
 *
 * Role-based visibility is evaluated in `SidebarNav`.
 */
export const NAV_SECTIONS: NavSection[] = [
  /* ── Main ── */
  {
    label: 'Main',
    items: [
      { label: 'Executive Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Leads', to: '/leads', icon: Users },
      { label: 'Students', to: '/students', icon: GraduationCap },
      { label: 'Courses', to: '/courses', icon: BookOpen },
      { label: 'Enrollment', to: '/enrollment-pipeline', icon: School },
    ],
  },

  /* ── AI Intelligence ── */
  {
    label: 'AI Intelligence',
    items: [
      { label: 'AI Lead Scoring', to: '/ai/lead-scoring', icon: Target },
      { label: 'Course Recommendation', to: '/ai/recommendations', icon: Sparkles },
      { label: 'Dropout Prediction', to: '/ai/predictive-insights', icon: BrainCircuit },
      { label: 'AI Insights', to: '/ai-insights', icon: Lightbulb },
      { label: 'AI Assistant', to: '/ai/assistant', icon: Bot },
    ],
  },

  /* ── CRM / Communication ── */
  {
    label: 'CRM & Communication',
    items: [
      { label: 'Email & Communication', to: '/communication', icon: Mail },
      { label: 'Follow-ups', to: '/follow-ups', icon: CalendarClock },
      { label: 'Email Campaigns', to: '/campaigns', icon: Mail },
      { label: 'Tasks', to: '/tasks', icon: ListTodo },
      { label: 'Meetings', to: '/meetings', icon: CalendarClock },
      { label: 'Call Intelligence', to: '/call-intelligence', icon: Phone, badge: 'LIVE' },
    ],
  },

  /* ── Analytics ── */
  {
    label: 'Analytics',
    items: [
      { label: 'Sales Analytics', to: '/analytics/sales', icon: BarChart3 },
      { label: 'Admission Analytics', to: '/analytics/admissions', icon: TrendingUp },
      { label: 'Marketing Analytics', to: '/analytics/marketing', icon: Megaphone },
    ],
  },

  /* ── System ── */
  {
    label: 'System',
    items: [
      { label: 'Notifications', to: '/notifications', icon: Bell },
      { label: 'Counselors', to: '/counselors', icon: Users },
      { label: 'Settings', to: '/settings', icon: Settings },
      { label: 'Compliance', to: '/compliance', icon: ShieldCheck },
    ],
  },
]

import { ArrowDownRight, ArrowUpRight, Briefcase, GraduationCap, IndianRupee, Percent, UserCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Card } from '@/components/common/Card'
import { cn } from '@/utils/cn'
import { formatDelta } from '@/utils/format'
import type { Kpi, KpiIconKey } from '@/types/dashboard'

const iconMap: Record<KpiIconKey, LucideIcon> = {
  users: Users,
  'user-check': UserCheck,
  percent: Percent,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  'indian-rupee': IndianRupee,
}

/** Real education photograph per KPI, matching the card's subject. */
const KPI_IMAGES: Record<string, { src: string; alt: string }> = {
  'total-leads': {
    src: '/images/leads-prospect.jpg',
    alt: 'A prospective student studying with a laptop in a library',
  },
  'qualified-leads': {
    src: '/images/leads-counselling-2.jpg',
    alt: 'An admissions counsellor talking with a student in front of a computer',
  },
  'enrollment-conversion': {
    src: '/images/enrollment-admission.jpg',
    alt: 'University students celebrating admission',
  },
  'active-opportunities': {
    src: '/images/leads-consultant.jpg',
    alt: 'An education consultant working with a laptop in an office',
  },
  'total-students': {
    src: '/images/students-studying.jpg',
    alt: 'College students studying together at a library table',
  },
  'revenue-pipeline': {
    src: '/images/analytics-charts.jpg',
    alt: 'A professional reviewing charts on a laptop monitor',
  },
}

const FALLBACK_IMAGE = {
  src: '/images/students-laptops.jpg',
  alt: 'Students studying with laptops in a library',
}

/** Icon chip + delta badge color per accent (used over the photo). */
const accentClasses: Record<string, { chip: string; badge: string }> = {
  indigo: {
    chip: 'bg-white/95 text-indigo-600 shadow-sm',
    badge: 'bg-white/95 text-indigo-700 shadow-sm',
  },
  violet: {
    chip: 'bg-white/95 text-violet-600 shadow-sm',
    badge: 'bg-white/95 text-violet-700 shadow-sm',
  },
  emerald: {
    chip: 'bg-white/95 text-emerald-600 shadow-sm',
    badge: 'bg-white/95 text-emerald-700 shadow-sm',
  },
  sky: {
    chip: 'bg-white/95 text-sky-600 shadow-sm',
    badge: 'bg-white/95 text-sky-700 shadow-sm',
  },
  amber: {
    chip: 'bg-white/95 text-amber-600 shadow-sm',
    badge: 'bg-white/95 text-amber-700 shadow-sm',
  },
  rose: {
    chip: 'bg-white/95 text-rose-600 shadow-sm',
    badge: 'bg-white/95 text-rose-700 shadow-sm',
  },
}

/**
 * Image-rich KPI card — a real education photograph fills the top ~half of
 * the card (object-fit: cover) with the metric icon and delta badge overlaid
 * on the photo, then the label, value and caption below. Purple is used for
 * icons and the delta arrow; the card body stays clean white.
 */
/** KPI card — maps to the relevant page for navigation. */
const KPI_NAVIGATION: Record<string, string> = {
  'total-leads': '/leads',
  'qualified-leads': '/leads',
  'enrollment-conversion': '/enrollment-pipeline',
  'active-opportunities': '/leads',
  'total-students': '/students',
  'revenue-pipeline': '/analytics/sales',
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = iconMap[kpi.icon]
  const accent = accentClasses[kpi.accent] ?? accentClasses.indigo
  const image = KPI_IMAGES[kpi.id] ?? FALLBACK_IMAGE
  const unavailable = kpi.unavailable === true
  const deltaAvailable = !unavailable && kpi.deltaAvailable !== false
  const isUp = deltaAvailable && kpi.delta >= 0
  const deltaZero = deltaAvailable && kpi.delta === 0
  const navigate = useNavigate()
  const navTo = KPI_NAVIGATION[kpi.id]

  return (
    <Card
      className={cn('group flex h-full flex-col overflow-hidden', navTo && 'cursor-pointer')}
      onClick={navTo ? () => navigate(navTo) : undefined}
      role={navTo ? 'link' : undefined}
      tabIndex={navTo ? 0 : undefined}
      onKeyDown={navTo ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(navTo) } } : undefined}
      aria-label={navTo ? `View ${kpi.label}` : undefined}
    >
      {/* Real education photograph — fills the complete image area */}
      <div className="relative h-32 w-full shrink-0 overflow-hidden sm:h-36">
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent" />

        <div className="absolute bottom-3 left-3">
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accent.chip)}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        </div>

        <span
          className={cn(
            'absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
            accent.badge,
          )}
        >
          {deltaAvailable && !deltaZero && (isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />)}
          {deltaAvailable ? formatDelta(kpi.delta) : '—'}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {kpi.label}
        </p>
        <p
          className={cn(
            'mt-1.5 font-bold leading-none tracking-tight text-slate-900 tabular-nums',
            unavailable ? 'text-[17px] text-slate-500' : 'text-[26px]',
          )}
        >
          {unavailable ? 'Not available' : kpi.value}
        </p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500">
          {kpi.caption ??
            (unavailable
              ? 'Not available in connected dataset'
              : deltaAvailable
                ? 'vs previous period'
                : 'Full period (no date field)')}
        </p>
      </div>
    </Card>
  )
}

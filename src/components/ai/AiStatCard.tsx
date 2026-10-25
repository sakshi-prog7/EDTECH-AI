import type { LucideIcon } from 'lucide-react'

import { Card } from '@/components/common/Card'
import { cn } from '@/utils/cn'

interface AiStatCardProps {
  icon: LucideIcon
  label: string
  value: string
  caption?: string
  accent?: 'violet' | 'emerald' | 'amber' | 'sky' | 'rose' | 'slate'
  className?: string
}

/** Real education photograph per stat label, matching the card's subject. */
const LABEL_IMAGES: Record<string, { src: string; alt: string }> = {
  'Total Leads': {
    src: '/images/leads-prospect.jpg',
    alt: 'A prospective student studying with a laptop in a library',
  },
  Platforms: {
    src: '/images/campaigns-digital.jpg',
    alt: 'A professional managing digital marketing campaigns',
  },
  Regions: {
    src: '/images/students-collaborating.jpg',
    alt: 'Diverse students collaborating with laptops',
  },
  'AI Scores': {
    src: '/images/cap-ai-scoring.jpg',
    alt: 'An admissions professional reviewing AI lead score charts',
  },
  'Active Courses': {
    src: '/images/courses-selection.jpg',
    alt: 'Students selecting courses in a lecture hall',
  },
  'Top Course': {
    src: '/images/courses-tech.jpg',
    alt: 'Students in a technology classroom using computers',
  },
  'OULAD Courses': {
    src: '/images/courses-online.jpg',
    alt: 'A person taking notes during an online learning session',
  },
  Enrolled: {
    src: '/images/enrollment-celebration.jpg',
    alt: 'Students celebrating graduation outdoors',
  },
  'Overall Conversion': {
    src: '/images/enrollment-hallway.jpg',
    alt: 'Graduating students walking down a university hallway',
  },
  'Enrolled Students': {
    src: '/images/enrollment-admission.jpg',
    alt: 'University students celebrating admission',
  },
  'Enrollment Forecast': {
    src: '/images/enrollment-graduation.jpg',
    alt: 'Graduates in academic dress on campus',
  },
  'Forecast Growth': {
    src: '/images/analytics-tablet.jpg',
    alt: 'A professional reviewing graphs on a digital tablet',
  },
  'Active Signals': {
    src: '/images/cap-ai-scoring.jpg',
    alt: 'An admissions professional reviewing AI score charts',
  },
  'Dropout Prediction': {
    src: '/images/students-studying.jpg',
    alt: 'College students studying together at a library table',
  },
  'Course Offerings': {
    src: '/images/courses-online-learning.jpg',
    alt: 'A student learning online with a laptop',
  },
  Registrations: {
    src: '/images/students-laptops.jpg',
    alt: 'Students studying with laptops and books in a library',
  },
  'Distinct Modules': {
    src: '/images/courses-online.jpg',
    alt: 'A person taking notes during an online learning session',
  },
  'Personalized Recs': {
    src: '/images/recommendations.jpg',
    alt: 'A student reviewing course recommendations on a laptop',
  },
}

const FALLBACK_IMAGE = {
  src: '/images/students-laptops.jpg',
  alt: 'Students studying with laptops in a library',
}

const accents: Record<string, { chip: string }> = {
  violet: { chip: 'bg-white/95 text-violet-600 shadow-sm' },
  emerald: { chip: 'bg-white/95 text-emerald-600 shadow-sm' },
  amber: { chip: 'bg-white/95 text-amber-600 shadow-sm' },
  sky: { chip: 'bg-white/95 text-sky-600 shadow-sm' },
  rose: { chip: 'bg-white/95 text-rose-600 shadow-sm' },
  slate: { chip: 'bg-white/95 text-slate-600 shadow-sm' },
}

/** Image-rich AI stat card — real photo header, then label, value, caption. */
export function AiStatCard({ icon: Icon, label, value, caption, accent = 'violet', className }: AiStatCardProps) {
  const image = LABEL_IMAGES[label] ?? FALLBACK_IMAGE
  const chip = accents[accent]?.chip ?? accents.violet.chip

  return (
    <Card className={cn('group flex h-full flex-col overflow-hidden', className)}>
      {/* Real education photograph */}
      <div className="relative h-24 w-full shrink-0 overflow-hidden sm:h-28">
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-slate-900/10 to-transparent" />
        <div className="absolute bottom-2.5 left-3">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', chip)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <p className="mt-1.5 text-[24px] font-bold leading-none tracking-tight text-slate-900 tabular-nums">
          {value}
        </p>
        {caption && (
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500">{caption}</p>
        )}
      </div>
    </Card>
  )
}

import { ArrowRight, CalendarClock, CircleAlert, Flame, Sparkles, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'
import { AiConfidenceBadge } from '@/components/ai/AiConfidenceBadge'
import { cn } from '@/utils/cn'
import type { AiInsight, InsightIconKey, InsightPriority, InsightTone } from '@/types/dashboard'

const iconMap: Record<InsightIconKey, LucideIcon> = {
  flame: Flame,
  alert: CircleAlert,
  calendar: CalendarClock,
  trending: TrendingUp,
  sparkles: Sparkles,
}

/** Real education photograph per insight tone, matching the signal's mood. */
const toneImages: Record<InsightTone, { src: string; alt: string }> = {
  danger: {
    src: '/images/students-studying.jpg',
    alt: 'Students studying intently at a library table',
  },
  warning: {
    src: '/images/analytics-charts.jpg',
    alt: 'A professional reviewing charts on a laptop monitor',
  },
  success: {
    src: '/images/enrollment-celebration.jpg',
    alt: 'Students celebrating graduation outdoors',
  },
  info: {
    src: '/images/students-collaborating.jpg',
    alt: 'Students collaborating with laptops in a learning space',
  },
  brand: {
    src: '/images/cap-ai-scoring.jpg',
    alt: 'An admissions professional reviewing AI score charts',
  },
}

const priorityVariants: Record<InsightPriority, BadgeVariant> = {
  High: 'danger',
  Medium: 'warning',
  Low: 'neutral',
}

interface AiSignalCardProps {
  insight: AiInsight
  confidence?: number
  provider?: string
  model?: string
  className?: string
}

/** Premium AI signal card — real photo header, tone chip, title, message. */
export function AiSignalCard({ insight, confidence, provider, model, className }: AiSignalCardProps) {
  const Icon = iconMap[insight.icon]
  const image = toneImages[insight.tone]

  return (
    <Card className={cn('group flex h-full flex-col overflow-hidden', className)}>
      <CardImageHeader
        src={image.src}
        alt={image.alt}
        label="AI Signal"
        icon={Icon}
        heightClass="h-24 sm:h-28"
      />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-900 dark:text-white">
            <span className="rounded bg-gradient-to-r from-violet-600 to-purple-500 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-white">
              AI
            </span>
            {insight.title}
          </h3>
          <Badge variant={priorityVariants[insight.priority]}>{insight.priority}</Badge>
        </div>
        <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {insight.message}
        </p>

        {/* AI Confidence and Model Info */}
        {confidence !== undefined && (
          <div className="mt-3">
            <AiConfidenceBadge confidence={confidence} provider={provider} model={model} />
          </div>
        )}

        <div className="mt-4">
          <Link
            to={insight.actionTo}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-indigo-600 transition-all hover:text-indigo-500 group-hover:gap-1.5 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {insight.actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  )
}

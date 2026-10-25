import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from '@/components/common/Card'
import { CardImageHeader } from '@/components/common/CardImageHeader'

interface IntelligencePanelProps {
  title?: string
  children: ReactNode
  /** Optional small confidence / match line rendered at the bottom. */
  meta?: ReactNode
  /** Optional real photograph header for the panel. */
  image?: { src: string; alt: string }
  className?: string
}

/** Consistent "EDTECH AI Intelligence" presentation panel. */
export function IntelligencePanel({ title = 'EDTECH AI Intelligence', children, meta, image, className }: IntelligencePanelProps) {
  return (
    <Card padding={false} className={`relative overflow-hidden ${className ?? ''}`}>
      {image && (
        <CardImageHeader
          src={image.src}
          alt={image.alt}
          label={title}
          icon={Sparkles}
          heightClass="h-28 sm:h-32"
        />
      )}
      <div className="p-5">
        {!image && (
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">
            <Sparkles className="h-3 w-3" />
            {title}
          </p>
        )}
        <div className={image ? 'mt-2 text-[13px] leading-relaxed text-slate-800 dark:text-slate-200' : 'mt-3 text-[13px] leading-relaxed text-slate-800 dark:text-slate-200'}>
          {children}
        </div>
        {meta && <div className="mt-4">{meta}</div>}
      </div>
    </Card>
  )
}

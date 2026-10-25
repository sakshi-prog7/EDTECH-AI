import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface PageBannerProps {
  /** Photo source. When omitted, `children` renders as the banner art instead. */
  src?: string
  /** Meaningful image description for screen readers (required when `src` is set). */
  alt?: string
  /** Small uppercase context label overlaid at the bottom of the banner. */
  label: string
  icon: LucideIcon
  /** Short supporting caption that explains why the visual belongs on this page. */
  caption?: string
  /** Custom code-built banner art (used instead of a photo). */
  children?: ReactNode
  /** Slimmer banner height (e.g. for dense pages like the dashboard). */
  compact?: boolean
  className?: string
}

/**
 * Contextual section banner for app pages — a rounded photo (or code-built
 * visual) with a readability gradient and a small context label, so every
 * image has a clear purpose and never sits over important content. Photos
 * are lazy-loaded and use object-fit: cover so they stay crisp and light.
 */
export function PageBanner({ src, alt, label, icon: Icon, caption, children, compact, className }: PageBannerProps) {
  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-white/10 dark:bg-navy-900 ${className ?? ''}`}
    >
      <div className={`relative ${compact ? 'h-36 sm:h-40 lg:h-44' : 'h-52 sm:h-56 lg:h-64'}`}>
        {src ? (
          <img
            src={src}
            alt={alt ?? ''}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0">
            {children}
          </div>
        )}

        {/* Subtle violet brand tint + readability gradient over the art */}
        <div aria-hidden="true" className="absolute inset-0 bg-violet-900/10" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent px-5 pb-4 pt-20 sm:px-6"
        >
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-violet-200/90">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </p>
          {caption && (
            <p className="mt-1 max-w-2xl text-[13.5px] font-medium leading-snug text-white/90">{caption}</p>
          )}
        </div>
      </div>
    </div>
  )
}

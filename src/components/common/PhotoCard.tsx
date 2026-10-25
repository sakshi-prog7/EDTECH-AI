import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface PhotoCardProps {
  src: string
  alt: string
  title: string
  description: string
  /** Optional internal route for the card link. */
  to?: string
  linkLabel?: string
  className?: string
}

/**
 * Photographic content card — a large real photo fills the complete image
 * area (object-fit: cover, responsive), with the title and description
 * below, matching the reference card structure:
 *
 *   [ LARGE REAL PHOTO ]
 *   [ Card Title ]
 *   [ Short description ]
 *   [ Optional link ]
 */
export function PhotoCard({ src, alt, title, description, to, linkLabel = 'Learn more', className }: PhotoCardProps) {
  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-violet-400/30 ${className ?? ''}`}
    >
      {/* Large photo — fills the complete image area, never a thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-violet-900/10" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[15.5px] font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>

        {to && (
          <Link
            to={to}
            className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[12.5px] font-semibold text-violet-700 transition-colors group-hover:text-violet-600 dark:text-violet-300 dark:group-hover:text-violet-200"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </article>
  )
}

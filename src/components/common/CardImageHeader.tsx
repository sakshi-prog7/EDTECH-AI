import type { LucideIcon } from 'lucide-react'

interface CardImageHeaderProps {
  src: string
  alt: string
  /** Small uppercase context label overlaid at the bottom of the photo. */
  label: string
  icon?: LucideIcon
  /** Height utility — default is a slim strip for chart/table cards. */
  heightClass?: string
  className?: string
}

/**
 * Full-width photo header for dashboard cards — a real education photograph
 * that completely fills the strip (object-fit: cover) with a readability
 * gradient and a small icon + label overlay. Top corners round automatically
 * when placed as the first child of an `overflow-hidden` rounded card.
 */
export function CardImageHeader({
  src,
  alt,
  label,
  icon: Icon,
  heightClass = 'h-20 sm:h-24',
  className,
}: CardImageHeaderProps) {
  return (
    <div className={`relative w-full shrink-0 overflow-hidden ${heightClass} ${className ?? ''}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-slate-900/5" />

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-5 pb-3">
        {Icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/95">
          {label}
        </span>
      </div>
    </div>
  )
}

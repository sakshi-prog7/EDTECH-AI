import type { PhotoCardProps } from '@/components/common/PhotoCard'
import { PhotoCard } from '@/components/common/PhotoCard'

interface PhotoCardGridProps {
  items: PhotoCardProps[]
  /** Optional small uppercase label above the grid. */
  label?: string
  /** Number of columns on large screens. Default 3. */
  columns?: 2 | 3
  className?: string
}

/**
 * Responsive grid of photographic cards (3-up by default, 2-up for smaller
 * sets), with an optional context label so every image group has a purpose.
 */
export function PhotoCardGrid({ items, label, columns = 3, className }: PhotoCardGridProps) {
  return (
    <div className={className}>
      {label && (
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
          {label}
        </p>
      )}
      <div
        className={
          columns === 2
            ? 'grid gap-4 sm:grid-cols-2'
            : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
        }
      >
        {items.map((item) => (
          <PhotoCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  )
}

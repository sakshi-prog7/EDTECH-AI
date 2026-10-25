import type { HTMLAttributes } from 'react'

import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether to apply the default inner padding. */
  padding?: boolean
}

/**
 * Clean white card — thin #E5E7EB border, soft shadow, 18px rounded corners
 * and a gentle translateY(-4px) hover lift, matching the Home Page's card
 * language. No glassmorphism, no decorative gradients or glow overlays.
 */
export function Card({ className, padding = true, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'relative rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.09)] dark:border-white/10 dark:bg-navy-900 dark:shadow-none dark:hover:border-white/20 dark:hover:shadow-[0_10px_28px_rgba(0,0,0,0.45)]',
        padding && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

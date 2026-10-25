
import { Sparkles } from 'lucide-react'

import { cn } from '@/utils/cn'

interface BrandProps {
  /** Icon-only variant for the collapsed sidebar. */
  collapsed?: boolean
  /** Light text variant for dark/gradient backgrounds (e.g. login panel). */
  light?: boolean
  /** Larger variant for auth pages (login / register) with responsive text. */
  size?: 'sm' | 'lg'
  className?: string
}

export function Brand({ collapsed = false, light = false, size = 'sm', className }: BrandProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-sm shadow-indigo-600/30',
          size === 'lg' ? 'h-12 w-12' : 'h-9 w-9',
        )}
      >
        <Sparkles
          className={cn('text-white', size === 'lg' ? 'h-7 w-7' : 'h-5 w-5')}
          strokeWidth={2.2}
        />
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p
            className={cn(
              'truncate tracking-tight',
              light ? 'text-white' : 'text-slate-900 dark:text-white',
              size === 'lg'
                ? 'text-[26px] font-extrabold sm:text-[32px] lg:text-[36px] xl:text-[40px]'
                : 'text-[15px] font-bold',
            )}
          >
            EDTECH AI
          </p>
          <p
            className={cn(
              'truncate',
              light ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400',
              size === 'lg'
                ? 'mt-0.5 text-[12px] font-semibold sm:text-[13px] lg:text-[14px] xl:text-[15px]'
                : 'text-[11px] font-medium',
            )}
          >
            EDTECH AI
          </p>
        </div>
      )}
    </div>
  )
}

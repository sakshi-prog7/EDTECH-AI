import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  className?: string
  children?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, className, children }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      {Icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:text-slate-400 dark:bg-white/5 dark:text-slate-400">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="mt-3 text-[13.5px] font-semibold text-slate-700 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {children}
    </div>
  )
}

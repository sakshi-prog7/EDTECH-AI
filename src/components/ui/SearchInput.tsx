import type { InputHTMLAttributes, ReactNode } from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional element rendered at the right edge (e.g. a ⌘K hint). */
  trailing?: ReactNode
}

/**
 * Global search input. Light theme follows the readability spec:
 * white background, visible slate border, dark text (#172033-ish), readable
 * placeholder, purple border on hover and a clear purple focus ring.
 */
export function SearchInput({ trailing, className, ...rest }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
      <input
        type="search"
        className={
          className ??
          'h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-12 text-[13px] text-slate-900 shadow-xs outline-none transition-colors placeholder:text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/60 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/25 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-indigo-400/60 dark:hover:bg-white/[0.08] dark:focus:border-indigo-400 dark:focus:bg-white/10'
        }
        {...rest}
      />
      {trailing && (
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">{trailing}</div>
      )}
    </div>
  )
}

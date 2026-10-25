import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationBarProps {
  page: number
  pages: number
  total: number
  onPage: (page: number) => void
}

export function PaginationBar({ page, pages, total, onPage }: PaginationBarProps) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 dark:border-white/10">
      <p className="text-[11.5px] tabular-nums text-slate-500">
        Page <span className="font-semibold text-slate-700 dark:text-slate-300">{page}</span> of {pages} ·{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-300">{total.toLocaleString()}</span> total
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11.5px] font-semibold text-slate-700 transition-colors hover:border-indigo-400/40 hover:text-indigo-700 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-indigo-200"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11.5px] font-semibold text-slate-700 transition-colors hover:border-indigo-400/40 hover:text-indigo-700 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-indigo-200"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

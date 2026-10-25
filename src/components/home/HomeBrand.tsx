import { Sparkles } from 'lucide-react'

/**
 * Homepage brand — violet logo mark with the EDTECH AI wordmark and a
 * small "EDTECH AI" subtitle. Deliberately light-only so the clean white
 * marketing page never renders dark-mode variants.
 */
export function HomeBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-sm shadow-violet-600/20">
        <Sparkles className="h-5 w-5 text-white" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">EDTECH AI</p>
        <p className="truncate text-[11px] font-medium text-indigo-600">EDTECH AI</p>
      </div>
    </div>
  )
}

/**
 * Global search modal — Cmd+K / Ctrl+K triggered.
 *
 * Searches across leads, students, courses, enrollments, tasks, and meetings
 * from the live database via the existing `/api/crm/search` endpoint.
 * Shows categorized results with keyboard navigation (arrow keys + Enter).
 */
import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  CalendarClock,
  Command,
  FileText,
  GraduationCap,
  ListChecks,
  Loader2,
  Search,
  Users,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/utils/cn'
import { globalSearch, type SearchResult } from '@/services/crmApi'

const KIND_ICONS: Record<string, typeof Users> = {
  lead: Users,
  student: GraduationCap,
  course: BookOpen,
  enrollment: FileText,
  task: ListChecks,
  meeting: CalendarClock,
}

const KIND_COLORS: Record<string, string> = {
  lead: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10',
  student: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10',
  course: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10',
  enrollment: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10',
  task: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10',
  meeting: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-500/10',
}

export function GlobalSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search with debounce
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const res = await globalSearch(query.trim())
        if (!cancelled) {
          setResults(res.results ?? [])
          setSelectedIdx(0)
        }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      navigateToResult(results[selectedIdx])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const navigateToResult = (result: SearchResult) => {
    navigate(result['/to'] || '/dashboard')
    onClose()
  }

  if (!open) return null

  // Group results by kind
  const grouped = new Map<string, SearchResult[]>()
  for (const r of results) {
    const kind = r.type || 'other'
    if (!grouped.has(kind)) grouped.set(kind, [])
    grouped.get(kind)!.push(r)
  }

  let flatIdx = -1

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]" role="dialog" aria-modal="true" aria-label="Global search">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 dark:border dark:border-white/10" onKeyDown={handleKeyDown}>
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
          {loading ? (
            <Loader2 className="h-4.5 w-4.5 shrink-0 animate-spin text-slate-400" />
          ) : (
            <Search className="h-4.5 w-4.5 shrink-0 text-slate-400" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads, students, courses, tasks…"
            className="flex-1 bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100"
            aria-label="Search"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <div className="px-4 py-8 text-center">
              <Command className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">Type to search across all records</p>
              <p className="mt-1 text-[11.5px] text-slate-400 dark:text-slate-500">Search leads, students, courses, enrollments, tasks, and meetings</p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">No results for &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-[11.5px] text-slate-400 dark:text-slate-500">Try a different search term</p>
            </div>
          ) : (
            <div className="py-2">
              {[...grouped.entries()].map(([kind, items]) => {
                const Icon = KIND_ICONS[kind] || FileText
                const colorClass = KIND_COLORS[kind] || 'text-slate-600 bg-slate-50'
                return (
                  <div key={kind}>
                    <p className="px-4 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {kind}s
                    </p>
                    {items.map((item) => {
                      flatIdx++
                      const idx = flatIdx
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigateToResult(item)}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            idx === selectedIdx ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5',
                          )}
                        >
                          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', colorClass)}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                            {item.subtitle && <p className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">{item.subtitle}</p>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400 dark:border-white/10 dark:text-slate-500">
          <span>Type at least 2 characters to search</span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-[9px] dark:border-white/10 dark:bg-white/5">↑↓</kbd> navigate
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-[9px] dark:border-white/10 dark:bg-white/5">↵</kbd> select
          </span>
        </div>
      </div>
    </div>
  )
}

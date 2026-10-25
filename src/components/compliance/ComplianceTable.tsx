import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  PackageSearch,
} from 'lucide-react'

import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Card } from '@/components/common/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/SearchInput'
import { cn } from '@/utils/cn'
import type { ComplianceDependency, ComplianceStatus, LicenseCategory } from '@/types/compliance'

const PAGE_SIZE = 10

const statusVariants: Record<ComplianceStatus, BadgeVariant> = {
  Compatible: 'success',
  'Review Required': 'warning',
  Unknown: 'danger',
}

const licenseVariants: Record<LicenseCategory, BadgeVariant> = {
  MIT: 'brand',
  ISC: 'info',
  'Apache-2.0': 'neutral',
  BSD: 'info',
  GPL: 'warning',
  LGPL: 'warning',
  Other: 'neutral',
  'Unknown / Needs Review': 'danger',
}

type SortKey = 'name' | 'license'
type SortDir = 'asc' | 'desc'

interface ComplianceTableProps {
  dependencies: ComplianceDependency[]
  onSelect: (dependency: ComplianceDependency) => void
}

/**
 * Searchable / filterable / sortable inventory of the project's installed
 * dependencies. Everything is computed from the real compliance manifest —
 * search, license filter, status filter, sorting and pagination all run over
 * the actual dependency data.
 */
export function ComplianceTable({ dependencies, onSelect }: ComplianceTableProps) {
  const [query, setQuery] = useState('')
  const [licenseFilter, setLicenseFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  const licenseOptions = useMemo(
    () => [...new Set(dependencies.map((d) => d.licenseCategory))].sort(),
    [dependencies],
  )
  const statusOptions = useMemo(
    () => [...new Set(dependencies.map((d) => d.status))].sort(),
    [dependencies],
  )

  const hasActiveFilters = licenseFilter !== 'All' || statusFilter !== 'All' || query.trim() !== ''

  const clearFilters = () => {
    setQuery('')
    setLicenseFilter('All')
    setStatusFilter('All')
    setPage(1)
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = dependencies.filter((d) => {
      if (licenseFilter !== 'All' && d.licenseCategory !== licenseFilter) return false
      if (statusFilter !== 'All' && d.status !== statusFilter) return false
      if (q) {
        return [d.name, d.purpose, d.license].filter((v): v is string => Boolean(v)).some((v) => v.toLowerCase().includes(q))
      }
      return true
    })
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'license') return a.licenseCategory.localeCompare(b.licenseCategory) * dir
      return a.name.localeCompare(b.name) * dir
    })
  }, [dependencies, query, licenseFilter, statusFilter, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const selectPage = (next: number) => {
    setPage(Math.min(Math.max(1, next), pageCount))
  }

  return (
    <Card padding={false} className="overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-full sm:w-72">
            <SearchInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search package, license or purpose…"
              aria-label="Search dependencies"
            />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            <FilterSelect label="License" value={licenseFilter} onChange={(v) => { setLicenseFilter(v); setPage(1) }} options={licenseOptions} />
            <FilterSelect label="Status" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} options={statusOptions} />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-2.5 text-[11.5px] font-semibold text-indigo-700 dark:text-indigo-200 transition-all duration-200 hover:border-indigo-400/40 hover:bg-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
              >
                <FilterX className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        <p className="text-[11.5px] text-slate-500" aria-live="polite">
          Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{visible.length}</span> of{' '}
          {dependencies.length} dependencies
          {hasActiveFilters && ' (filtered)'}
        </p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No dependencies found"
          description="Try adjusting your search or clearing the active filters."
          className="py-14"
        />
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden min-w-0 overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <caption className="sr-only">
                Installed dependencies with license and compliance status from the compliance manifest
              </caption>
              <thead>
                <tr className="border-y border-slate-200 bg-white/[0.02] dark:border-white/10">
                  <SortableHeader label="Package Name" active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                  <th scope="col" className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Installed Version
                  </th>
                  <SortableHeader label="License" active={sortKey === 'license'} dir={sortDir} onClick={() => toggleSort('license')} />
                  <th scope="col" className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Purpose
                  </th>
                  <th scope="col" className="whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Compliance Status
                  </th>
                  <th scope="col" className="sr-only">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pageRows.map((d) => (
                  <tr
                    key={d.name}
                    onClick={() => onSelect(d)}
                    className="cursor-pointer transition-colors duration-200 hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <div className="leading-tight">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{d.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {d.type === 'direct' ? 'Direct' : 'Transitive'}
                          {d.dev ? ' · dev' : ''}
                        </p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-slate-700 dark:text-slate-300">
                      {d.version || '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <Badge variant={licenseVariants[d.licenseCategory]}>
                        {d.licenseCategory === 'Unknown / Needs Review' ? 'Unknown / Needs Review' : d.licenseCategory}
                      </Badge>
                    </td>
                    <td className="max-w-[320px] px-5 py-3.5">
                      <p className="truncate text-slate-600 dark:text-slate-300">{d.purpose ?? '—'}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <Badge variant={statusVariants[d.status]} dot>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <ul className="divide-y divide-white/5 md:hidden">
            {pageRows.map((d) => (
              <li key={d.name}>
                <button
                  type="button"
                  onClick={() => onSelect(d)}
                  className="block w-full px-4 py-4 text-left transition-colors hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{d.name}</p>
                      <p className="text-[11px] text-slate-500">
                        v{d.version || '—'}
                        {d.type === 'direct' ? ' · Direct' : ' · Transitive'}
                        {d.dev ? ' · dev' : ''}
                      </p>
                    </div>
                    <Badge variant={statusVariants[d.status]} dot>
                      {d.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Badge variant={licenseVariants[d.licenseCategory]}>
                      {d.licenseCategory === 'Unknown / Needs Review' ? 'Unknown / Needs Review' : d.licenseCategory}
                    </Badge>
                    <span className="truncate pl-3 text-[11.5px] text-slate-500">{d.purpose ?? '—'}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <Pagination page={safePage} pageCount={pageCount} onPage={selectPage} />
        </>
      )}
    </Card>
  )
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th scope="col" className="whitespace-nowrap px-5 py-2.5 text-left">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60',
          active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  )
}

function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number
  pageCount: number
  onPage: (page: number) => void
}) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 dark:border-white/10">
      <p className="text-[11.5px] tabular-nums text-slate-500">
        Page <span className="font-semibold text-slate-700 dark:text-slate-300">{page}</span> of {pageCount}
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
          disabled={page >= pageCount}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11.5px] font-semibold text-slate-700 transition-colors hover:border-indigo-400/40 hover:text-indigo-700 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-indigo-200"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="relative">
      <label htmlFor={`compliance-filter-${label.toLowerCase()}`} className="sr-only">
        Filter by {label.toLowerCase()}
      </label>
      <select
        id={`compliance-filter-${label.toLowerCase()}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-40 max-w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-7 text-[12px] font-medium text-slate-800 outline-none transition-colors hover:border-indigo-400 hover:bg-indigo-50/60 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/[0.08]"
      >
        <option value="All">All {label}s</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
    </div>
  )
}

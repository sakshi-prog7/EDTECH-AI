import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '@/services/authApi'
import type { ListParams, Paginated } from '@/services/crmApi'

export interface ApiListOptions {
  pageSize?: number
  /** Extra stable filter keys (e.g. status tabs). Changes reset to page 1. */
  extraParams?: ListParams
}

export interface ApiListState<T> {
  items: T[]
  total: number
  pages: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  /** The raw search text currently in the input (controlled). */
  search: string
  /** The active filter values (e.g. `{ status: 'QUALIFIED' }`). */
  filters: ListParams
  setPage: (page: number) => void
  setSearch: (q: string) => void
  setFilter: (patch: ListParams) => void
  refresh: () => void
}

/**
 * Drives a paginated + searchable + filterable table against a backend list
 * API returning the standard `{ items, total, page, pageSize, pages }` shape.
 * Debounces the search input and resets to page 1 whenever filters change.
 */
export function useApiList<T>(
  fetcher: (params: ListParams) => Promise<Paginated<T>>,
  options: ApiListOptions = {},
): ApiListState<T> {
  const { pageSize = 10, extraParams } = options
  const [page, setPageState] = useState(1)
  const [search, setSearchState] = useState('')
  const [filters, setFilters] = useState<ListParams>({})
  const [data, setData] = useState<Paginated<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const debounceRef = useRef<number | null>(null)

  const refresh = useCallback(() => {
    setAttempt((n) => n + 1)
  }, [])

  const setSearch = useCallback((q: string) => {
    setSearchState(q)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      setPageState(1)
      setFilters((f) => ({ ...f, search: q.trim() || undefined }))
    }, 300)
  }, [])

  const setFilter = useCallback((patch: ListParams) => {
    setPageState(1)
    setFilters((f) => ({ ...f, ...patch }))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetcher({ ...extraParams, ...filters, page, pageSize })
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null)
          setLoading(false)
          setError(err instanceof ApiError ? err.message : 'Could not load this list. Please try again.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [fetcher, filters, page, pageSize, extraParams, attempt])

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
  }, [])

  const safePage = data ? Math.min(page, Math.max(1, data.pages)) : page

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    pages: data?.pages ?? 1,
    page: safePage,
    pageSize,
    loading,
    error,
    search,
    filters,
    setPage: setPageState,
    setSearch,
    setFilter,
    refresh,
  }
}

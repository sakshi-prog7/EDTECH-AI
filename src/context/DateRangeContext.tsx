import { createContext, useContext, useState, type ReactNode } from 'react'

import type { DashboardRange } from '@/types/datasets'

interface DateRangeContextValue {
  range: DashboardRange
  setRange: (range: DashboardRange) => void
}

const DateRangeContext = createContext<DateRangeContextValue | undefined>(undefined)

/**
 * Global dashboard date filter. One shared state drives the Topbar selector
 * and every data page (Dashboard, Leads, Students, Enrollment) so the
 * selected window is always consistent across the app.
 */
export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DashboardRange>('30d')
  return <DateRangeContext.Provider value={{ range, setRange }}>{children}</DateRangeContext.Provider>
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext)
  if (!ctx) {
    throw new Error('useDateRange must be used within a DateRangeProvider')
  }
  return ctx
}

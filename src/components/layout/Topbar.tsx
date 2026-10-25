import { Bell, Bot, CircleHelp, Menu, Search, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { ProfileMenu } from '@/components/layout/ProfileMenu'
import { DateRangeSelect } from '@/components/common/DateRangeSelect'
import { IconButton } from '@/components/common/IconButton'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useDateRange } from '@/context/DateRangeContext'
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications'
import { useAuth } from '@/context/AuthContext'
import { NAV_SECTIONS } from '@/data/navigation'

interface TopbarProps {
  onMenuClick: () => void
  onOpenAssistant: () => void
  onOpenSearch?: () => void
}

export function Topbar({ onMenuClick, onOpenAssistant, onOpenSearch }: TopbarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const current = getNavContext(pathname)
  const { range, setRange } = useDateRange()
  const { unread } = useUnreadNotifications()
  const { user } = useAuth()

  return (
    <header className="relative z-30 flex h-16 min-w-0 shrink-0 items-center gap-2 border-b border-[#E7E3F2] bg-white px-3 backdrop-blur-md sm:gap-3 sm:px-4 dark:border-white/10 dark:bg-[#08070d]/75 dark:backdrop-blur-xl lg:px-6">
      <IconButton label="Toggle navigation" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </IconButton>

      {/* Page title / breadcrumb */}
      <div className="hidden min-w-0 max-w-[210px] shrink-0 items-center gap-1.5 2xl:flex">
        {current && (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <span className="hidden text-slate-500 dark:text-slate-400 xl:inline">{current.section}</span>
            <span className="hidden text-slate-700 dark:text-slate-300 xl:inline">/</span>
            <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
              {current.label}
            </span>
          </nav>
        )}
      </div>

      <SearchBar onOpenSearch={onOpenSearch} />

      <div className="ml-0 flex shrink-0 items-center gap-1 sm:gap-1.5">
        <DateRangeSelect value={range} onChange={setRange} />

        <ThemeToggle />

        <IconButton label="Help" onClick={() => navigate('/ai/assistant')}>
          <CircleHelp className="h-[18px] w-[18px]" />
        </IconButton>

        <IconButton label="Notifications" className="relative" onClick={() => navigate('/notifications')}>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span
              aria-label={`${unread} unread notifications`}
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold leading-none text-white ring-2 ring-white dark:ring-navy-950"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </IconButton>

        <IconButton label="Settings" onClick={() => navigate('/settings')}>
          <Settings className="h-[18px] w-[18px]" />
        </IconButton>

        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-700 shadow-sm xl:flex dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300" title={`Authenticated as ${user?.email ?? 'user'}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          JWT SECURED
        </div>

        <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-white/10" />

        {/* AI Assistant */}
        <IconButton label="Open AI Assistant" onClick={onOpenAssistant} className="sm:hidden">
          <Bot className="h-[18px] w-[18px]" />
        </IconButton>
        <button
          type="button"
          onClick={onOpenAssistant}
          className="hidden h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-[#6d4aff] to-[#9b6dff] px-3.5 text-[13px] font-semibold text-white shadow-[0_0_18px_rgba(124,92,255,0.35)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_28px_rgba(124,92,255,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 sm:inline-flex"
        >
          <Bot className="h-4 w-4" />
          <span className="hidden md:inline">AI Assistant</span>
          <span className="hidden rounded bg-white/20 px-1 py-px text-[9px] font-bold uppercase tracking-wider xl:inline">
            Beta
          </span>
        </button>

        <ProfileMenu />
      </div>
    </header>
  )
}

function SearchBar({ onOpenSearch }: { onOpenSearch?: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenSearch}
      className="relative hidden min-w-0 flex-1 cursor-pointer sm:block"
      aria-label="Open search"
    >
      <div className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400">
        <Search className="h-4 w-4" />
      </div>
      <div className="flex h-9 w-full min-w-0 items-center overflow-hidden whitespace-nowrap rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-400 shadow-xs transition-colors hover:border-indigo-400 hover:bg-indigo-50/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-500 dark:hover:border-indigo-400/60 dark:hover:bg-white/[0.08]">
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">Search students, leads, courses…</span>
        <kbd className="ml-auto hidden rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 xl:inline dark:border-white/10 dark:bg-white/5 dark:text-slate-500">
          ⌘K
        </kbd>
      </div>
    </button>
  )
}

function getNavContext(pathname: string): { section: string; label: string } | null {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (pathname === item.to) return { section: section.label, label: item.label }
    }
  }
  // Nested routes (e.g. future /leads/:id)
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (pathname.startsWith(`${item.to}/`)) return { section: section.label, label: item.label }
    }
  }
  return null
}

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/common/Avatar'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

/**
 * Profile menu in the top bar. Opens a dropdown with Profile, Account &
 * Settings and Logout. Closes on outside click, Escape and after navigating.
 * Light/dark aware and styled to match the existing app chrome.
 */
export function ProfileMenu() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  // The topbar only renders inside the authenticated app shell, so the
  // session user is always available here.
  const displayUser = user

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="ml-1 hidden cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 sm:flex dark:hover:bg-white/5"
      >
        <Avatar name={displayUser?.name ?? 'Account'} size="sm" />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {displayUser?.name ?? 'Account'}
          </span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
            {displayUser ? displayUser.role.charAt(0) + displayUser.role.slice(1).toLowerCase() : ''}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'hidden h-4 w-4 text-slate-500 transition-transform duration-200 md:block dark:text-slate-400',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg shadow-slate-200/70 focus:outline-none dark:border-white/10 dark:bg-navy-900 dark:shadow-black/40"
        >
          <div className="border-b border-slate-100 px-4 py-2.5 dark:border-white/10">
            <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{displayUser?.name ?? 'Account'}</p>
            <p className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">{displayUser?.email ?? ''}</p>
          </div>

          <MenuItem icon={UserRound} label="Profile" onClick={() => go('/settings')} />
          <MenuItem icon={Settings} label="Account & Settings" onClick={() => go('/settings')} />
          <div className="my-1.5 border-t border-slate-100 dark:border-white/10" />
          <MenuItem icon={LogOut} label="Logout" danger onClick={handleLogout} />
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof UserRound
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/60',
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
          : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      {label}
    </button>
  )
}

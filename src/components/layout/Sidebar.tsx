import { ArrowLeft, LogOut, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/common/Avatar'
import { Brand } from '@/components/common/Brand'
import { IconButton } from '@/components/common/IconButton'
import { SidebarNav } from '@/components/navigation/SidebarNav'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'relative z-40 hidden h-full shrink-0 flex-col border-r border-[#E7E3F2] bg-[#F8F7FF] transition-[width] duration-200 dark:border-white/10 dark:bg-navy-900/95 dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)] dark:backdrop-blur-xl lg:flex',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-[#E7E3F2] px-4 dark:border-white/10">
          <Brand collapsed={collapsed} />
        </div>
        <BackToHome collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn('fixed inset-0 z-50 lg:hidden', !mobileOpen && 'pointer-events-none')}
        inert={!mobileOpen}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onCloseMobile}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-64 flex-col border-r border-[#E7E3F2] bg-[#F8F7FF] shadow-xl transition-transform duration-200 dark:border-white/10 dark:bg-navy-900 dark:backdrop-blur-xl',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#E7E3F2] px-4 dark:border-white/10">
            <Brand />
            <IconButton label="Close menu" onClick={onCloseMobile}>
              <X className="h-5 w-5" />
            </IconButton>
          </div>
          <BackToHome onNavigate={onCloseMobile} />
          <SidebarNav onNavigate={onCloseMobile} />
          <SidebarFooter />
        </aside>
      </div>
    </>
  )
}

function BackToHome({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <div className="shrink-0 border-b border-[#E7E3F2] p-3 dark:border-white/10">
      <Link
        to="/"
        onClick={onNavigate}
        title={collapsed ? 'Back to Home' : undefined}
        className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-[#343044] transition-colors hover:bg-[#F3F0FF] hover:text-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:border dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-indigo-300"
      >
        <ArrowLeft className="h-[18px] w-[18px] shrink-0 text-[#77728A] dark:text-slate-400 transition-transform duration-200 group-hover:-translate-x-0.5 dark:group-hover:text-indigo-300" />
        {!collapsed && <span className="truncate">Back to Home</span>}
      </Link>
    </div>
  )
}

function SidebarFooter({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const displayUser = user

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shrink-0 border-t border-[#E7E3F2] p-3 dark:border-white/10">
      <div className={cn('flex items-center gap-3 rounded-xl py-1.5', collapsed && 'justify-center')}>
        <Avatar name={displayUser?.name ?? 'Account'} size="sm" />
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold text-[#343044] dark:text-slate-100">
                {displayUser?.name ?? 'Account'}
              </p>
              <p className="truncate text-[11px] text-[#77728A] dark:text-slate-400">
                {displayUser ? displayUser.role.charAt(0) + displayUser.role.slice(1).toLowerCase() : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

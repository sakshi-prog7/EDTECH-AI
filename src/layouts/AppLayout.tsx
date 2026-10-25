import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { AiAssistantPanel } from '@/components/ai/AiAssistantPanel'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { GlobalSearchModal } from '@/components/ui/GlobalSearchModal'
import { DateRangeProvider } from '@/context/DateRangeContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Desktop: toggle the collapsed sidebar. Mobile: open the drawer.
  const handleMenuClick = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setCollapsed((value) => !value)
    } else {
      setMobileOpen(true)
    }
  }

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onOpenSearch: () => setSearchOpen(true),
    onCloseSearch: () => setSearchOpen(false),
    searchOpen,
  })

  // Close the mobile drawer / assistant with the Escape key.
  useEffect(() => {
    if (!mobileOpen && !assistantOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileOpen(false)
      setAssistantOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen, assistantOpen])

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-navy-950 dark:text-slate-100">
      {/* Dark-mode atmosphere: soft violet radial glow + subtle grid texture,
          matching the homepage's cinematic background language. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 hidden dark:block"
        style={{
          background:
            'radial-gradient(75% 55% at 50% -10%, rgba(124, 92, 255, 0.13), transparent 65%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 hidden dark:block"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <DateRangeProvider>
        <div className="relative z-10 flex h-full min-w-0 flex-1">
          <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onMenuClick={handleMenuClick} onOpenAssistant={() => setAssistantOpen(true)} onOpenSearch={() => setSearchOpen(true)} />

            <main id="main-content" className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </DateRangeProvider>

      <AiAssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

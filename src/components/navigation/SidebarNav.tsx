import { NavLink } from 'react-router-dom'

import { NAV_SECTIONS } from '@/data/navigation'
import { cn } from '@/utils/cn'

interface SidebarNavProps {
  collapsed?: boolean
  /** Called after navigating (used to close the mobile drawer). */
  onNavigate?: () => void
}

/**
 * Primary application navigation.
 *
 * The dashboard is a unified SalesGenie command center. Core modules stay
 * visible for every authenticated user so the shell never appears to lose
 * functionality because of the demo account's role. Backend/API guards still
 * protect sensitive write operations.
 */
export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  return (
    <nav
      aria-label="Primary"
      className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
    >
      <div className="space-y-5 pb-2">
        {NAV_SECTIONS.map((section) => (
          <section key={section.label}>
            <p
              className={cn(
                'mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B84A1] dark:text-slate-400',
                collapsed && 'sr-only',
              )}
            >
              {section.label}
            </p>

            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                  >
                    {({ isActive }: { isActive: boolean }) => (
                      <span
                        className={cn(
                          'flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-[background-color,color,box-shadow,transform] duration-150',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-gradient-to-r from-[#EEE8FF] via-[#F4F0FF] to-white font-semibold text-[#6D28D9] shadow-sm ring-1 ring-[#DDD6FE] dark:bg-[rgba(124,92,255,0.14)] dark:text-[#c4b5fd] dark:ring-[rgba(150,120,255,0.18)]'
                            : 'text-[#403A55] hover:bg-[#F7F4FF] hover:text-[#6D28D9] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100',
                        )}
                      >
                        <item.icon
                          className={cn(
                            'h-[18px] w-[18px] shrink-0 transition-colors',
                            isActive
                              ? 'text-[#7C3AED] dark:text-indigo-400'
                              : 'text-[#77728A] dark:text-slate-500 group-hover:text-[#7C3AED] dark:group-hover:text-indigo-300',
                          )}
                          strokeWidth={isActive ? 2.25 : 2}
                        />
                        {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>}
                        {!collapsed && item.badge && (
                          <span className="shrink-0 rounded-full bg-[#EDE9FE] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#7C3AED] dark:bg-indigo-500/20 dark:text-indigo-300">
                            {item.badge}
                          </span>
                        )}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  )
}

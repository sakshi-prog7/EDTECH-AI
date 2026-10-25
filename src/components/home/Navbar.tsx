import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Menu, Search, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { HomeBrand } from '@/components/home/HomeBrand'
import { cn } from '@/utils/cn'

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Platform', href: '#platform' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Analytics', href: '#analytics' },
  { label: 'AI Intelligence', href: '#ai-intelligence' },
  { label: 'About', href: '#about' },
]

/**
 * Premium modern AI/EdTech SaaS marketing header.
 * Clean white design, active-page indicator, purple accent hover states,
 * compact search, outlined Login and gradient Get Started CTA.
 * Sticky with a subtle border + shadow on scroll.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeSection, setActiveSection] = useState('home')
  const navigate = useNavigate()

  /* ---- scroll shadow ---- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ---- track which section is in view for the active indicator ---- */
  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.href.replace('#', ''))
    const observers: IntersectionObserver[] = []

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id)
        },
        { rootMargin: '-20% 0px -60% 0px' },
      )
      io.observe(el)
      observers.push(io)
    })

    return () => observers.forEach((io) => io.disconnect())
  }, [])

  /* ---- search ---- */
  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/leads?q=${encodeURIComponent(q)}` : '/leads')
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all duration-200',
        scrolled && 'shadow-[0_1px_12px_rgba(15,23,42,0.07)]',
      )}
    >
      <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between gap-6 px-5 lg:h-[68px] lg:px-10">
        {/* ---- Logo ---- */}
        <a href="#home" aria-label="EDTECH AI — back to top" className="shrink-0">
          <HomeBrand />
        </a>

        {/* ---- Desktop nav ---- */}
        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((link) => {
            const sectionId = link.href.replace('#', '')
            const isActive = activeSection === sectionId
            return (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  'group relative px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-200',
                  isActive
                    ? 'text-violet-600'
                    : 'text-slate-500 hover:text-violet-600',
                )}
              >
                {link.label}
                {/* Active indicator bar */}
                <span
                  className={cn(
                    'absolute bottom-0 left-3.5 right-3.5 h-[2px] rounded-full bg-violet-600 transition-all duration-200',
                    isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
                  )}
                />
              </a>
            )
          })}
        </nav>

        {/* ---- Desktop right actions ---- */}
        <div className="hidden items-center gap-2.5 lg:flex">
          {/* Search */}
          <form onSubmit={handleSearch} role="search" className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search leads"
              className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-[12.5px] text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 xl:w-48"
            />
          </form>

          {/* Login — clean outlined button */}
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 transition-all duration-200 hover:border-violet-300 hover:text-violet-600 hover:shadow-sm"
          >
            Login
          </Link>

          {/* Get Started — premium gradient CTA */}
          <Link
            to="/dashboard"
            className="group inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-5 text-[13px] font-semibold text-white shadow-sm shadow-violet-600/20 transition-all duration-200 hover:from-violet-700 hover:to-purple-700 hover:shadow-md hover:shadow-violet-600/25"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* ---- Mobile hamburger ---- */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-800"
          >
            {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      {/* ---- Mobile menu panel ---- */}
      <div
        className={cn(
          'lg:hidden overflow-hidden transition-all duration-250 ease-in-out',
          open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <nav aria-label="Mobile" className="space-y-0.5 border-t border-slate-100 bg-white px-5 pb-5 pt-3">
          {NAV_LINKS.map((link) => {
            const sectionId = link.href.replace('#', '')
            const isActive = activeSection === sectionId
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center rounded-lg px-3.5 py-2.5 text-[14px] font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-violet-50 text-violet-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                {link.label}
              </a>
            )
          })}

          {/* Mobile search */}
          <form
            onSubmit={(e) => {
              handleSearch(e)
              setOpen(false)
            }}
            role="search"
            className="relative mt-3"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search leads"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-[13px] text-slate-700 placeholder:text-slate-400 transition-all duration-200 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </form>

          {/* Mobile actions */}
          <div className="flex items-center gap-3 pt-3">
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-600 transition-all duration-200 hover:border-violet-300 hover:text-violet-600"
            >
              Login
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all duration-200 hover:from-violet-700 hover:to-purple-700"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}

import { Link } from 'react-router-dom'

import { HomeBrand } from '@/components/home/HomeBrand'

const LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Analytics', href: '#analytics' },
  { label: 'AI Intelligence', href: '#ai-intelligence' },
  { label: 'About', href: '#about' },
]

/** Clean white footer — brand, key anchors and a copyright line. */
export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      id="footer"
      className="border-t border-slate-200 bg-white pb-10 pt-16 lg:pt-20"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
          <div>
            <HomeBrand />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              AI-powered intelligence for smarter EdTech admissions and sales.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[13.5px] font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-7 sm:flex-row">
          <p className="text-xs text-slate-500">© {year} EDTECH AI</p>
          <div className="flex items-center gap-7">
            <Link to="/login" className="text-xs text-slate-500 transition-colors hover:text-slate-900">
              Sign In
            </Link>
            <Link to="/dashboard" className="text-xs text-slate-500 transition-colors hover:text-slate-900">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

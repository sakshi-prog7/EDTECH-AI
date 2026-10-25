import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Full-width photographic hero — a professional analytics dashboard photograph fills the entire
 * banner (object-fit: cover, ~500px tall) with a subtle dark overlay for
 * text readability. Centered headline, sub-copy and two CTAs.
 */
export function HeroSection() {
  return (
    <section id="home" className="relative">
      <div className="relative h-[440px] w-full overflow-hidden sm:h-[500px]">
        <img
          src="/images/hero-students.jpg"
          alt="Modern data analytics dashboard showing sales forecasting metrics and AI-powered visualizations"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Subtle dark overlay for text readability */}
        <div aria-hidden="true" className="absolute inset-0 bg-slate-900/50" />

        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              AI POWERED SALES FORECASTING
              <span className="block">EDTECH AI</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
              Turn student data into smarter enrollment decisions with AI-powered sales intelligence.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#platform"
                className="inline-flex h-12 items-center rounded-full bg-violet-600 px-7 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
              >
                Explore Platform
              </a>
              <Link
                to="/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-100"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

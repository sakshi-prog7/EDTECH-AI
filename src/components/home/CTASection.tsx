import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Final call-to-action — a full-width section with a professional education
 * photograph as the background, a dark overlay for readability, and a single
 * primary action.
 */
export function CTASection() {
  return (
    <section id="cta" className="relative overflow-hidden">
      <img
        src="/images/enrollment-celebration.jpg"
        alt="Students celebrating graduation outdoors"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-slate-900/65" />

      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center lg:py-32">
        <h2 className="text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
          Ready to Make Enrollment Smarter?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
          Use AI-powered insights to understand students, prioritize leads and
          improve enrollment.
        </p>
        <div className="mt-9">
          <Link
            to="/dashboard"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-violet-600 px-8 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Education + AI — a large real photograph of students using technology on
 * the left, and a short label, heading, paragraph and CTA on the right.
 * Background stays white.
 */
export function EducationAiSection() {
  return (
    <section id="ai-intelligence" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Large real photograph */}
          <div className="overflow-hidden rounded-2xl">
            <img
              src="/images/students-collaborating.jpg"
              alt="Students collaborating with laptops and technology in a modern learning space"
              loading="lazy"
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </div>

          {/* Copy */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">
              AI-Powered Education
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Turn Student Data Into Smarter Decisions
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-600">
              EDTECH AI brings student behavior, engagement and course
              interest together in one intelligent admissions workflow. The
              platform turns scattered signals into clear next steps — so
              education teams know exactly who to reach, when, and why.
            </p>
            <Link
              to="/ai/assistant"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-violet-600 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-violet-700"
            >
              Explore AI Intelligence
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

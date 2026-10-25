import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const FEATURES = [
  {
    src: '/images/cap-lead-management.jpg',
    alt: 'An admissions team working in front of computers',
    title: 'Lead Management',
    description: 'Organize every inquiry and track prospects through a single admissions pipeline.',
    to: '/leads',
  },
  {
    src: '/images/cap-ai-scoring.jpg',
    alt: 'An admissions professional reviewing AI lead score charts on a laptop',
    title: 'AI Lead Scoring',
    description: 'Score every lead against enrollment likelihood with AI-driven intelligence.',
    to: '/ai/lead-scoring',
  },
  {
    src: '/images/courses-selection.jpg',
    alt: 'A student reviewing course options on a laptop',
    title: 'Course Recommendations',
    description: 'Suggest the right programs to the right students at the right moment.',
    to: '/ai/recommendations',
  },
  {
    src: '/images/cap-followups.jpg',
    alt: 'A counsellor on a phone call in front of a laptop',
    title: 'Automated Follow-ups',
    description: 'AI-timed, personalized follow-ups that reach every lead at the perfect moment.',
    to: '/follow-ups',
  },
]

/**
 * Platform features — four professional education-style cards, each with a
 * large photograph that fills the top of the card, a title, short
 * description and a "Learn More" link.
 */
export function FeaturesSection() {
  return (
    <section id="platform" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">
            The Platform
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything You Need to Grow Enrollment
          </h2>
        </div>

        <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
            >
              <div className="h-52 w-full overflow-hidden">
                <img
                  src={feature.src}
                  alt={feature.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-[17px] font-semibold tracking-tight text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                  {feature.description}
                </p>
                <Link
                  to={feature.to}
                  className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[13px] font-semibold text-violet-600 transition-colors hover:text-violet-700"
                >
                  Learn More
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

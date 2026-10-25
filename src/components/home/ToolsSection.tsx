const TOOLS = [
  {
    src: '/images/students-laptops.jpg',
    alt: 'Students learning with laptops in a library',
    title: 'Student Insights',
    description: 'Understand student interests, engagement and enrollment intent.',
  },
  {
    src: '/images/leads-counselling-2.jpg',
    alt: 'An admissions counsellor talking with a student in front of a computer',
    title: 'Lead Intelligence',
    description: 'Identify high-intent leads and prioritize your admissions efforts.',
  },
  {
    src: '/images/about-team.jpg',
    alt: 'An education admissions team collaborating in a modern office',
    title: 'Smart Enrollment',
    description: 'Convert qualified prospects into successful enrollments.',
  },
]

/**
 * Clean white section with three large image cards — every photo completely
 * fills its image container (object-fit: cover) so no thumbnails appear.
 */
export function ToolsSection() {
  return (
    <section id="solutions" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">
            Sales Intelligence
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Powerful Tools for Education Sales
          </h2>
        </div>

        <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <article
              key={tool.title}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
            >
              {/* Large photo — fills the complete image area */}
              <div className="h-60 w-full overflow-hidden">
                <img
                  src={tool.src}
                  alt={tool.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">{tool.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{tool.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

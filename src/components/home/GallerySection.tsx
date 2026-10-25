const ITEMS = [
  {
    src: '/images/students-studying.jpg',
    alt: 'College students studying together at a library table',
    title: 'Students Learning',
  },
  {
    src: '/images/why-counselling.jpg',
    alt: 'An admissions counsellor assisting a student with exam preparation on a laptop',
    title: 'Counsellor Meeting',
  },
  {
    src: '/images/courses-tech.jpg',
    alt: 'Students in a modern technology classroom using computers',
    title: 'Modern Classroom',
  },
  {
    src: '/images/students-collaborating-2.jpg',
    alt: 'A diverse group of students collaborating indoors',
    title: 'Students Collaborating',
  },
]

/**
 * "Life Behind Every Enrollment" — four large photographic cards in a clean
 * grid, in the spirit of the reference library's "Life At Our Library".
 * Images are visually dominant and fill their containers completely.
 */
export function GallerySection() {
  return (
    <section id="about" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">
            About EDTECH AI
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Life Behind Every Enrollment
          </h2>
        </div>

        <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <figure
              key={item.title}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
            >
              <div className="aspect-[3/4] w-full overflow-hidden">
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="px-5 py-4">
                <p className="text-[15px] font-semibold tracking-tight text-slate-900">{item.title}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

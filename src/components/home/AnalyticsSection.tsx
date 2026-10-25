interface AnalyticsCard {
  label: string
  value: string
  change: string
  bars: number[]
}

const CARDS: AnalyticsCard[] = [
  {
    label: 'Qualified Leads',
    value: '1,284',
    change: '+18.6%',
    bars: [32, 44, 38, 52, 46, 60, 68],
  },
  {
    label: 'High Intent Students',
    value: '642',
    change: '+24.1%',
    bars: [28, 36, 42, 40, 52, 58, 64],
  },
  {
    label: 'Enrollment Conversion',
    value: '32.4%',
    change: '+6.2%',
    bars: [30, 38, 44, 48, 46, 56, 62],
  },
]

function MiniChart({ bars }: { bars: number[] }) {
  const max = Math.max(...bars)
  return (
    <div aria-hidden="true" className="flex h-16 items-end gap-1.5">
      {bars.map((value, index) => (
        <span
          key={index}
          className="w-full rounded-sm bg-violet-200 last:bg-violet-600"
          style={{ height: `${Math.round((value / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

/**
 * Analytics band — three clean white cards with a subtle border, a headline
 * statistic, a small inline bar chart and a trend pill. Demo values only.
 */
export function AnalyticsSection() {
  return (
    <section id="analytics" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">
            Analytics
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Data That Helps You Sell Smarter
          </h2>
        </div>

        <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-md"
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {card.label}
              </p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <p className="text-4xl font-bold tracking-tight text-slate-900">{card.value}</p>
                <span className="mb-1 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-600">
                  {card.change}
                </span>
              </div>
              <div className="mt-6">
                <MiniChart bars={card.bars} />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-[11px] tracking-wide text-slate-400">
          Demo metrics shown for product presentation — not connected to live data.
        </p>
      </div>
    </section>
  )
}

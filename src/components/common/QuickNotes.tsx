import { cn } from '@/utils/cn'

interface QuickNotesProps {
  options: string[]
  value: string
  onChange: (val: string) => void
  className?: string
}

/**
 * Renders a row of clickable preset-note chips above a textarea.
 * Clicking a chip appends the preset text (separated by newline if there's
 * already content). Clicking a selected chip removes it.
 */
export function QuickNotes({ options, value, onChange, className }: QuickNotesProps) {
  const toggle = (preset: string) => {
    const lines = value.split('\n').filter(Boolean)
    const idx = lines.indexOf(preset)
    if (idx >= 0) {
      lines.splice(idx, 1)
    } else {
      lines.push(preset)
    }
    onChange(lines.join('\n'))
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((preset) => {
        const active = value.split('\n').includes(preset)
        return (
          <button
            key={preset}
            type="button"
            onClick={() => toggle(preset)}
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
              active
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300',
            )}
          >
            {active && <span className="mr-1">✓</span>}
            {preset}
          </button>
        )
      })}
    </div>
  )
}

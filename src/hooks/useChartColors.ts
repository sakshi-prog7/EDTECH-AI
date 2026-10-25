import { useTheme } from '@/context/ThemeContext'

/** Chart colors that adapt to the active light/dark theme. */
export function useChartColors() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  return {
    grid: dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
    tick: dark ? '#a5a1c8' : '#64748b',
    legend: dark ? '#c7c3e6' : '#475569',
    tooltip: {
      backgroundColor: dark ? '#0d0b16' : '#ffffff',
      border: dark ? 'rgba(150,120,255,0.3)' : '#e2e8f0',
      color: dark ? '#f1f0fa' : '#0f172a',
    },
  }
}

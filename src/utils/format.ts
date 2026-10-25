/**
 * Format a signed percentage change with at most two decimal places:
 *   `+14.01%`, `-5.24%`, `0.00%`
 *
 * Safe for any finite number; callers must guard `null`/`NaN` before calling.
 */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta.toFixed(2)}%`
  if (delta < 0) return `${delta.toFixed(2)}%`
  return '0.00%'
}

/**
 * Minimal CSV export helper — builds a CSV string from row objects and
 * triggers a browser download. No dependencies; works in any browser.
 */

/** Escape a single CSV cell (quotes, commas, newlines). */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Serialize row objects into a CSV document (header row first). */
export function rowsToCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(',')),
  ]
  return lines.join('\r\n')
}

/**
 * Download `rows` as a CSV file with the given filename. Throws when the
 * download cannot be created (e.g. Blob unsupported).
 */
export function exportCsv(filename: string, rows: Array<Record<string, unknown>>): void {
  downloadTextFile(filename, rowsToCsv(rows), 'text/csv;charset=utf-8;')
}

/**
 * Download an arbitrary text document (CSV, Markdown, …) with the given
 * filename and MIME type. Throws when the download cannot be created.
 */
export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

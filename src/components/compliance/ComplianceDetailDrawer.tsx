import { useEffect } from 'react'
import { ExternalLink, FileText, Package, X } from 'lucide-react'

import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { IconButton } from '@/components/common/IconButton'
import { cn } from '@/utils/cn'
import type { ComplianceDependency, ComplianceStatus, LicenseCategory } from '@/types/compliance'

const statusVariants: Record<ComplianceStatus, BadgeVariant> = {
  Compatible: 'success',
  'Review Required': 'warning',
  Unknown: 'danger',
}

const licenseVariants: Record<LicenseCategory, BadgeVariant> = {
  MIT: 'brand',
  ISC: 'info',
  'Apache-2.0': 'neutral',
  BSD: 'info',
  GPL: 'warning',
  LGPL: 'warning',
  Other: 'neutral',
  'Unknown / Needs Review': 'danger',
}

interface ComplianceDetailDrawerProps {
  dependency: ComplianceDependency | null
  onClose: () => void
}

/**
 * Right-hand detail panel for a single dependency. Shows only real metadata
 * from the compliance manifest — missing fields render as "Not available"
 * rather than inventing values.
 */
export function ComplianceDetailDrawer({ dependency, onClose }: ComplianceDetailDrawerProps) {
  useEffect(() => {
    if (!dependency) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dependency, onClose])

  return (
    <div
      className={cn('fixed inset-0 z-50', !dependency && 'pointer-events-none')}
      inert={!dependency}
      aria-hidden={!dependency}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
          dependency ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={dependency ? `Dependency details: ${dependency.name}` : 'Dependency details'}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-navy-900 shadow-2xl shadow-black/50 transition-transform duration-300 dark:border-white/10',
          dependency ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {dependency && (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5 dark:border-white/10">
              <div className="flex min-w-0 items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0 leading-tight">
                  <h2 className="break-words text-lg font-semibold tracking-tight text-white">{dependency.name}</h2>
                  <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                    v{dependency.version}
                    <span className="mx-1.5 text-slate-600">·</span>
                    {dependency.type === 'direct' ? 'Direct' : 'Transitive'}
                    {dependency.dev ? ' · dev' : ''}
                  </p>
                </div>
              </div>
              <IconButton label="Close dependency details" onClick={onClose}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>

            {/* License + compliance badges */}
            <div className="flex flex-wrap items-center gap-2 px-5 pt-5">
              <Badge variant={licenseVariants[dependency.licenseCategory]}>{dependency.licenseCategory}</Badge>
              <Badge variant={statusVariants[dependency.status]} dot>
                {dependency.status}
              </Badge>
            </div>

            {/* Details */}
            <div className="px-5 py-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Package Information
              </h3>
              <dl className="mt-3 space-y-3.5 text-[13px]">
                <DetailRow label="License">
                  <span className="font-medium text-slate-100">
                    {dependency.license ?? 'Not specified in package metadata'}
                  </span>
                </DetailRow>
                <DetailRow label="Purpose">
                  <span className="font-medium leading-snug text-slate-100">
                    {dependency.purpose ?? 'Not available in package metadata'}
                  </span>
                </DetailRow>
                <DetailRow label="Repository">
                  {dependency.repository ? (
                    <a
                      href={dependency.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 font-medium text-indigo-400 underline-offset-2 hover:underline"
                    >
                      <span className="truncate">{dependency.repository}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-slate-400">Not available</span>
                  )}
                </DetailRow>
                <DetailRow label="Homepage">
                  {dependency.homepage ? (
                    <a
                      href={dependency.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 font-medium text-indigo-400 underline-offset-2 hover:underline"
                    >
                      <span className="truncate">{dependency.homepage}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-slate-400">Not available</span>
                  )}
                </DetailRow>
                <DetailRow label="Compliance Status">
                  <span className="font-medium text-slate-100">{dependency.status}</span>
                </DetailRow>
              </dl>

              {/* License text reference */}
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-slate-200 px-3.5 py-3 dark:border-white/10 bg-white/[0.03]">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    License text
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-slate-800 dark:text-slate-200">
                    {dependency.licenseFile
                      ? `Full license text ships with the package (node_modules/${dependency.name}/LICENSE*). Review it before distribution.`
                      : 'No LICENSE file was found inside the installed package. The license must be verified from upstream before distribution.'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  )
}

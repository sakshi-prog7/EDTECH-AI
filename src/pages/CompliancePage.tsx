import { useCallback, useState } from 'react'
import { Boxes, Download, FileCheck, Package, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/common/Skeleton'
import { ComplianceDetailDrawer } from '@/components/compliance/ComplianceDetailDrawer'
import { ComplianceTable } from '@/components/compliance/ComplianceTable'
import { Toast, type ToastState } from '@/components/ui/Toast'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getComplianceManifest, summarizeCompliance } from '@/services/complianceService'
import { downloadTextFile } from '@/utils/exportCsv'
import { cn } from '@/utils/cn'
import type { ComplianceDependency } from '@/types/compliance'

const PAGE_EYEBROW = 'EDTECH AI • Compliance'
const PAGE_TITLE = 'Open Source & License Compliance'
const PAGE_DESCRIPTION = 'Dependency licensing and third-party software compliance'

export function CompliancePage() {
  const fetcher = useCallback(() => getComplianceManifest(), [])
  const { data, loading, error, retry } = useAsyncData(fetcher)
  const [selected, setSelected] = useState<ComplianceDependency | null>(null)

  return (
    <>
      {loading || !data ? (
        <>
          <PageHeader eyebrow={PAGE_EYEBROW} title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
          <ComplianceSkeleton />
        </>
      ) : error ? (
        <>
          <PageHeader eyebrow={PAGE_EYEBROW} title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
          <ErrorState message={error ?? undefined} onRetry={retry} />
        </>
      ) : (
        <ComplianceContent
          generatedAt={data.generatedAt}
          projectLicense={data.projectLicense}
          projectLicenseFile={data.projectLicenseFile}
          dependencies={data.dependencies}
          onSelect={setSelected}
        />
      )}

      <ComplianceDetailDrawer dependency={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function ComplianceContent({
  generatedAt,
  projectLicense,
  projectLicenseFile,
  dependencies,
  onSelect,
}: {
  generatedAt: string
  projectLicense: string | null
  projectLicenseFile: string | null
  dependencies: ComplianceDependency[]
  onSelect: (dependency: ComplianceDependency) => void
}) {
  const summary = summarizeCompliance(dependencies)
  const [toast, setToast] = useState<ToastState | null>(null)

  const handleExport = () => {
    if (dependencies.length === 0) {
      setToast({ kind: 'error', message: 'No compliance data loaded to export.' })
      return
    }
    try {
      const licenseCounts = new Map<string, number>()
      const statusCounts = new Map<string, number>()
      for (const d of dependencies) {
        licenseCounts.set(d.licenseCategory, (licenseCounts.get(d.licenseCategory) ?? 0) + 1)
        statusCounts.set(d.status, (statusCounts.get(d.status) ?? 0) + 1)
      }
      const licenseSummary = [...licenseCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([license, count]) => `- ${license}: ${count}`)
        .join('\n')
      const statusSummary = [...statusCounts.entries()].map(([s, c]) => `${s}: ${c}`).join(', ')
      const flagged = dependencies.filter((d) => d.status !== 'Compatible')
      const esc = (v: string) => v.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

      const lines = [
        '# Open Source & License Compliance Report',
        '',
        `- Generated: ${formatGeneratedAt(generatedAt)}`,
        `- Project license: ${projectLicense ?? 'Not specified'}${projectLicenseFile ? ` (${projectLicenseFile})` : ''}`,
        `- Total dependencies: ${dependencies.length}`,
        `- Compliance statuses: ${statusSummary}`,
        '',
        '## License summary',
        '',
        licenseSummary,
        '',
        '## Dependency list',
        '',
        '| Package | Version | License | Purpose | Compliance Status |',
        '| --- | --- | --- | --- | --- |',
        ...dependencies.map(
          (d) =>
            `| ${esc(d.name)} | ${esc(d.version)} | ${esc(d.license ?? 'Unknown')} | ${esc(d.purpose ?? '—')} | ${d.status} |`,
        ),
        '',
        '## Packages requiring review or with unknown licenses',
        '',
        flagged.length > 0
          ? flagged.map((d) => `- ${d.name}@${d.version} — ${d.license ?? 'Unknown'} — ${d.status}`).join('\n')
          : '- None',
        '',
      ]
      downloadTextFile('edtech-ai-compliance-report.md', lines.join('\n'), 'text/markdown;charset=utf-8;')
      setToast({ kind: 'success', message: `Exported compliance report for ${dependencies.length} dependencies.` })
    } catch {
      setToast({ kind: 'error', message: 'Could not generate the compliance report download.' })
    }
  }

  return (
    <>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <PageHeader
        eyebrow={PAGE_EYEBROW}
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        actions={
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export Compliance Report
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Summary cards — real counts derived from the compliance manifest */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Package}
            label="Total Dependencies"
            value={summary.total.toLocaleString('en-US')}
            caption="Installed packages in package-lock.json"
            accent="indigo"
          />
          <SummaryCard
            icon={ShieldCheck}
            label="MIT Licensed"
            value={summary.mit.toLocaleString('en-US')}
            caption={`${((summary.mit / summary.total) * 100).toFixed(0)}% of the inventory`}
            accent="emerald"
          />
          <SummaryCard
            icon={Boxes}
            label="Other Licenses"
            value={summary.otherLicenses.toLocaleString('en-US')}
            caption="ISC, Apache-2.0, BSD, MPL-2.0, dual & more"
            accent="amber"
          />
          <SummaryCard
            icon={FileCheck}
            label="License Info Available"
            value={`${summary.licenseInfoAvailable.toLocaleString('en-US')} of ${summary.total.toLocaleString('en-US')}`}
            caption="From installed package metadata"
            accent="sky"
          />
        </div>

        {/* Project license banner */}
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Project License</h2>
              <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                {projectLicenseFile
                  ? `Detected ${projectLicenseFile} at the project root.`
                  : 'No LICENSE file was found in the project root.'}
              </p>
              <p className="mt-3 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                Project license:{' '}
                <span
                  className={cn(
                    projectLicense ? 'text-indigo-700 dark:text-indigo-300' : 'text-amber-600 dark:text-amber-400',
                  )}
                >
                  {projectLicense ?? 'Not specified'}
                </span>
              </p>
            </div>
            {projectLicense ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-50 px-3.5 py-3 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200 sm:max-w-xs">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                <p className="text-[12.5px] leading-snug">
                  {projectLicense} license detected — the project license is specified.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-50 px-3.5 py-3 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200 sm:max-w-xs">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                <p className="text-[12.5px] leading-snug">
                  Project license should be finalized before production/distribution.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Dependency inventory */}
        <ComplianceTable dependencies={dependencies} onSelect={onSelect} />

        <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
          Source: package-lock.json + installed package metadata · generated {formatGeneratedAt(generatedAt)} ·{' '}
          {summary.needsReview > 0 ? (
            <>
              <span className="font-semibold text-amber-600 dark:text-amber-400">{summary.needsReview} packages</span>{' '}
              require review
            </>
          ) : (
            'all licenses verified'
          )}
          {summary.unknown > 0 && ` · ${summary.unknown} with undetermined licenses`}
        </p>

        {/* Why this matters */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Why this matters</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            This project depends on third-party open-source software. Every dependency is distributed under its own
            license — the values shown here come directly from the installed package metadata (package-lock.json and the
            packages' own package.json files), not from assumptions. License notices and the applicable license terms
            must be preserved according to each dependency's license when this software is distributed.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            Packages with permissive licenses (MIT, ISC, Apache-2.0, BSD) are marked <Badge variant="success" dot>Compatible</Badge>.
            Copyleft, dual-licensed or unlisted packages are flagged{' '}
            <Badge variant="warning" dot>Review Required</Badge> until their terms are confirmed against this project's
            distribution requirements. This page is an automated inventory aid, not legal advice — a qualified
            professional should confirm the final compliance position before production/distribution.
          </p>
        </Card>
      </div>
    </>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  caption,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: string
  caption: string
  accent: 'indigo' | 'emerald' | 'amber' | 'sky'
}) {
  const iconClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  }
  return (
    <Card className="group relative overflow-hidden">
      <div className="relative flex items-start justify-between gap-2">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors group-hover:brightness-105',
            iconClasses[accent],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="relative mt-4 text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="relative mt-0.5 text-[26px] font-bold leading-none tracking-tight text-slate-900 tabular-nums dark:text-white">
        {value}
      </p>
      <p className="relative mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">{caption}</p>
    </Card>
  )
}

function ComplianceSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading compliance data">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  )
}

function formatGeneratedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

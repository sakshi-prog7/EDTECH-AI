/**
 * Open-source compliance service.
 *
 * Fetches the manifest produced by `npm run compliance:generate`
 * (`public/data/compliance.json`) and exposes derived summary counts used by
 * the Compliance page. All numbers come from the real installed dependency
 * inventory — nothing is hard-coded.
 */
import type { ComplianceDependency, ComplianceManifest } from '@/types/compliance'

let manifestPromise: Promise<ComplianceManifest> | null = null

/** Fetch (and cache) the compliance manifest. */
export function getComplianceManifest(): Promise<ComplianceManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch('/data/compliance.json').then((res) => {
      if (!res.ok) {
        throw new Error(
          `Compliance manifest not found (HTTP ${res.status}). Run \`npm run compliance:generate\` to generate it.`,
        )
      }
      return res.json() as Promise<ComplianceManifest>
    })
  }
  return manifestPromise
}

/** Drop the cached manifest so the next fetch re-reads the real file. */
export function invalidateComplianceManifest(): void {
  manifestPromise = null
}

export interface ComplianceSummary {
  total: number
  mit: number
  otherLicenses: number
  /** Dependencies with usable license information (non-empty raw license). */
  licenseInfoAvailable: number
  /** Dependencies that still need manual review. */
  needsReview: number
  /** Dependencies whose license could not be determined. */
  unknown: number
}

/** Derive summary counts from the real dependency inventory. */
export function summarizeCompliance(dependencies: ComplianceDependency[]): ComplianceSummary {
  const mit = dependencies.filter((d) => d.licenseCategory === 'MIT').length
  return {
    total: dependencies.length,
    mit,
    otherLicenses: dependencies.length - mit,
    licenseInfoAvailable: dependencies.filter((d) => d.license !== null && d.license !== '').length,
    needsReview: dependencies.filter((d) => d.status === 'Review Required').length,
    unknown: dependencies.filter((d) => d.status === 'Unknown').length,
  }
}

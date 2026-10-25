/**
 * Types for the open-source compliance manifest produced by
 * `npm run compliance:generate` (scripts/generate-compliance.mjs).
 *
 * The manifest is written to `public/data/compliance.json` at build time and
 * fetched at runtime by `src/services/complianceService.ts`. Every field is
 * derived from the real installed dependency inventory (package-lock.json and
 * the installed package metadata in node_modules/) — nothing is fabricated
 * and missing fields are `null`.
 */

/** License display category (never guessed — derived from the SPDX string). */
export type LicenseCategory =
  | 'MIT'
  | 'ISC'
  | 'Apache-2.0'
  | 'BSD'
  | 'GPL'
  | 'LGPL'
  | 'Other'
  | 'Unknown / Needs Review'

/** Compliance status under the project's (conservative) distribution policy. */
export type ComplianceStatus = 'Compatible' | 'Review Required' | 'Unknown'

export interface ComplianceDependency {
  /** Package name (scope included, e.g. `@vitejs/plugin-react`). */
  name: string
  /** Installed version from package-lock.json. */
  version: string
  /** Raw SPDX license string from the lockfile (null when unavailable). */
  license: string | null
  /** Classified license category. */
  licenseCategory: LicenseCategory
  /** Real repository URL from the installed package metadata (null if unknown). */
  repository: string | null
  /** Real homepage URL from the installed package metadata (null if unknown). */
  homepage: string | null
  /** Package's own description (used as "Purpose" — null if unknown). */
  purpose: string | null
  /** Whether a LICENSE/COPYING/NOTICE file ships inside node_modules/<name>. */
  licenseFile: boolean
  status: ComplianceStatus
  /** Direct (declared in package.json) vs transitive dependency. */
  type: 'direct' | 'transitive'
  /** Dev-only dependency (from the lockfile / devDependencies). */
  dev: boolean
}

export interface ComplianceManifest {
  generatedAt: string
  /** Detected project license name, or null when the project has no LICENSE. */
  projectLicense: string | null
  /** Detected LICENSE file name, or null when none exists. */
  projectLicenseFile: string | null
  dependencies: ComplianceDependency[]
}

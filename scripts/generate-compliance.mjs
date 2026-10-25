#!/usr/bin/env node
/**
 * Build-time open-source compliance manifest generator.
 *
 * Reads the REAL installed dependency inventory from `package-lock.json`
 * (every `node_modules/*` entry — name, version, license, dev flag) and
 * enriches each entry with repository / homepage / description taken from the
 * installed package's own `package.json` in `node_modules/` when that file is
 * present. It never fabricates metadata: missing fields stay `null`.
 *
 * Output: `public/data/compliance.json` — a small JSON manifest the frontend
 * fetches at runtime (`src/services/complianceService.ts`), exactly like the
 * dataset manifest produced by `scripts/aggregate-datasets.mjs`.
 *
 * License classification is conservative:
 *  - a license is only labeled MIT/ISC/Apache-2.0/BSD/GPL/LGPL when the raw
 *    SPDX string from the lockfile maps unambiguously to that license;
 *  - compound expressions (e.g. "MIT AND ISC") and licenses outside the known
 *    set are classified "Other";
 *  - a dependency with no usable license information is classified
 *    "Unknown / Needs Review" — never guessed as MIT.
 *
 * Compliance status derives from the classification + a conservative
 * distribution policy: permissive licenses (MIT, ISC, Apache-2.0, BSD) are
 * "Compatible"; copyleft / compound / unlisted licenses are "Review Required";
 * undetermined licenses are "Unknown".
 *
 * Usage: `npm run compliance:generate` (part of the build pipeline).
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const LOCK_FILE = path.join(ROOT, 'package-lock.json')
const PKG_FILE = path.join(ROOT, 'package.json')
const OUT_DIR = path.join(ROOT, 'public', 'data')
const OUT_FILE = path.join(OUT_DIR, 'compliance.json')

/* ------------------------------------------------------------------ */
/* License classification                                             */
/* ------------------------------------------------------------------ */

/**
 * Classify a raw license string (SPDX expression from the lockfile) into a
 * display category. Unknown/unparseable strings map to "Unknown / Needs
 * Review" — never assumed to be MIT.
 */
function classifyLicense(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return 'Unknown / Needs Review'
  const upper = s.toUpperCase()

  // Compound SPDX expressions (e.g. "MIT AND ISC") are classified "Other":
  // which of the combined licenses applies depends on the package's own
  // LICENSE file, so they get flagged for manual review.
  if (/\b(AND|OR|WITH)\b/.test(upper)) return 'Other'

  if (/^MIT(?:[-\s].*)?$/.test(upper)) return 'MIT'
  if (/^ISC(?:[-\s].*)?$/.test(upper)) return 'ISC'
  if (/^APACHE[-\s]2\.0/.test(upper)) return 'Apache-2.0'
  if (/^BSD[- ]/.test(upper) || upper === 'BSD') return 'BSD'
  if (/^LGPL/.test(upper)) return 'LGPL'
  if (/^GPL/.test(upper) || /GENERAL PUBLIC LICENSE/.test(upper)) return 'GPL'
  if (/MPL/.test(upper)) return 'Other'

  return 'Unknown / Needs Review'
}

/** Conservative distribution policy: permissive = compatible, else review. */
function complianceStatus(category) {
  switch (category) {
    case 'MIT':
    case 'ISC':
    case 'Apache-2.0':
    case 'BSD':
      return 'Compatible'
    case 'GPL':
    case 'LGPL':
    case 'Other':
      return 'Review Required'
    default:
      return 'Unknown'
  }
}

/* ------------------------------------------------------------------ */
/* Repository / homepage normalization (never invented)                */
/* ------------------------------------------------------------------ */

function extractRepositoryUrl(repo) {
  if (!repo) return null
  if (typeof repo === 'string') {
    const s = repo.trim()
    if (!s) return null
    // Full URL (possibly with git+ prefix) — keep as-is (strip transport prefix).
    if (/^(https?|git|ssh):\/\//.test(s)) return s.replace(/^git\+/, '')
    // npm shorthand like "github:user/repo" or "user/repo" → GitHub URL.
    const m = s.match(/^(?:github|gitlab|bitbucket):([^/]+\/[^/]+)$/)
    if (m) return `https://github.com/${m[1]}`
    if (/^[^/]+\/[^/]+$/.test(s)) return `https://github.com/${s}`
    return null
  }
  if (typeof repo === 'object' && typeof repo.url === 'string') {
    return repo.url.replace(/^git\+/, '').replace(/\.git$/, '')
  }
  return null
}

function extractHomepage(homepage) {
  if (typeof homepage !== 'string') return null
  const s = homepage.trim()
  if (!s || !/^https?:\/\//.test(s)) return null
  return s
}

/* ------------------------------------------------------------------ */
/* Project LICENSE detection                                           */
/* ------------------------------------------------------------------ */

const LICENSE_CANDIDATES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENSE-MIT',
  'LICENSE-MIT.txt',
  'COPYING',
  'COPYING.md',
  'COPYING.txt',
]

/** Try to identify the license name from a LICENSE file's text. */
function detectLicenseName(text) {
  const head = text.slice(0, 20000)
  if (/MIT License|Permission is hereby granted, free of charge/i.test(head)) return 'MIT'
  if (/Apache License\s*Version 2\.0/i.test(head)) return 'Apache-2.0'
  if (/GNU LESSER GENERAL PUBLIC LICENSE/i.test(head)) {
    if (/Version 3/i.test(head)) return 'LGPL-3.0'
    if (/Version 2/i.test(head)) return 'LGPL-2.1'
    return 'LGPL'
  }
  if (/GNU GENERAL PUBLIC LICENSE/i.test(head)) {
    if (/Version 3/i.test(head)) return 'GPL-3.0'
    if (/Version 2/i.test(head)) return 'GPL-2.0'
    return 'GPL'
  }
  if (/ISC License|Permission to use, copy, modify, and\/or distribute this software/i.test(head)) return 'ISC'
  if (/BSD 3-Clause|Redistribution and use in source and binary forms/i.test(head)) return 'BSD-3-Clause'
  return null
}

function detectProjectLicense() {
  for (const name of LICENSE_CANDIDATES) {
    const file = path.join(ROOT, name)
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue
    try {
      const detected = detectLicenseName(fs.readFileSync(file, 'utf8'))
      return { file: name, name: detected ?? 'Detected (unidentified)' }
    } catch {
      return { file: name, name: 'Detected (unidentified)' }
    }
  }
  return { file: null, name: null }
}

/* ------------------------------------------------------------------ */
/* Manifest build                                                     */
/* ------------------------------------------------------------------ */

function buildDependencies(lock, pkgJson) {
  const direct = new Set([
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.devDependencies ?? {}),
  ])
  const deps = []

  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    if (!key.includes('node_modules')) continue // skip the root project entry
    const name = key.split('node_modules/').pop()
    if (!name) continue

    const rawLicense = typeof entry.license === 'string' ? entry.license : null
    const category = rawLicense ? classifyLicense(rawLicense) : 'Unknown / Needs Review'

    // Enrich with real metadata from the installed package.json (when present).
    let repository = null
    let homepage = null
    let description = null
    let licenseFile = false
    const installedPkg = path.join(ROOT, key, 'package.json')
    if (fs.existsSync(installedPkg)) {
      try {
        const meta = JSON.parse(fs.readFileSync(installedPkg, 'utf8'))
        repository = extractRepositoryUrl(meta.repository)
        homepage = extractHomepage(meta.homepage)
        description = typeof meta.description === 'string' && meta.description.trim() ? meta.description.trim() : null
        licenseFile = fs
          .readdirSync(path.join(ROOT, key))
          .some((f) => /^(license|copying|notice)(\..*)?$/i.test(f))
      } catch {
        // leave enrichment fields null
      }
    }

    deps.push({
      name,
      version: String(entry.version ?? ''),
      license: rawLicense ?? null,
      licenseCategory: category,
      repository,
      homepage,
      purpose: description,
      licenseFile,
      status: complianceStatus(category),
      type: direct.has(name) ? 'direct' : 'transitive',
      dev: entry.dev === true || Boolean(pkgJson.devDependencies?.[name]),
    })
  }

  return deps.sort((a, b) => a.name.localeCompare(b.name))
}

async function main() {
  if (!fs.existsSync(LOCK_FILE)) {
    console.error('[compliance:generate] package-lock.json not found — nothing to generate.')
    process.exit(1)
  }
  const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'))
  const pkgJson = JSON.parse(fs.readFileSync(PKG_FILE, 'utf8'))
  const projectLicense = detectProjectLicense()

  const dependencies = buildDependencies(lock, pkgJson)
  const manifest = {
    generatedAt: new Date().toISOString(),
    projectLicense: projectLicense.name,
    projectLicenseFile: projectLicense.file,
    dependencies,
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2), 'utf8')

  const byLicense = {}
  const byStatus = {}
  for (const d of dependencies) {
    byLicense[d.licenseCategory] = (byLicense[d.licenseCategory] ?? 0) + 1
    byStatus[d.status] = (byStatus[d.status] ?? 0) + 1
  }
  console.log(`[compliance:generate] wrote ${path.relative(ROOT, OUT_FILE)}`)
  console.log(`[compliance:generate] dependencies: ${dependencies.length}`)
  console.log(`[compliance:generate] licenses: ${JSON.stringify(byLicense)}`)
  console.log(`[compliance:generate] status: ${JSON.stringify(byStatus)}`)
  console.log(`[compliance:generate] project license: ${projectLicense.name ?? 'Not specified'}${projectLicense.file ? ` (${projectLicense.file})` : ''}`)
}

await main()

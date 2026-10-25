#!/usr/bin/env node
/**
 * Build-time dataset aggregator (Member 1 data → frontend manifest).
 *
 * Scans `data/cleaned/**` and `data/ml_ready/**` for CSV files, computes
 * schema-agnostic aggregates (only from columns that actually exist), and
 * writes a small JSON manifest to `public/data/datasets.json` that the
 * frontend fetches at runtime.
 *
 * Design rules:
 *  - NEVER fabricate values: a metric is computed only when the required
 *    column is detected; otherwise it is left `null`.
 *  - Large files (e.g. OULAD `studentVle.csv`) are aggregated HERE, in Node,
 *    and only tiny summaries are shipped — millions of rows never reach the
 *    browser.
 *  - When no datasets are found, the script still succeeds and writes
 *    `{ available: false }` so the build never fails on missing data.
 *
 * Usage: `npm run data:aggregate`  (exit code is always 0 on success).
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const DATA_DIR = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'public', 'data')
const OUT_FILE = path.join(OUT_DIR, 'datasets.json')
const RECORDS_DIR = path.join(OUT_DIR, 'records')

/*
 * Row-level record collectors — populated while scanning data/cleaned/ and
 * written to public/data/records/*.json. These are REAL dataset rows
 * (trimmed to a privacy-safe attribute set), never fabricated.
 */
const marketingRecords = [] // daily campaign rows (the real "lead records")
const campaignMetaMap = new Map() // campaignid -> { campaignType }
const studentRecords = [] // dropout dataset rows
let ouladCourseCatalog = [] // OULAD course module/presentation rows

/* ------------------------------------------------------------------ */
/* Small CSV parser (handles quotes, commas, CRLF, and `;` fallback)   */
/* ------------------------------------------------------------------ */
function parseCsv(text) {
  const delimiter = text.includes(';') && !text.includes(',') ? ';' : ','
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const pushRow = () => {
    if (row.some((f) => String(f).trim() !== '')) rows.push(row)
    row = []
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      pushRow()
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    pushRow()
  }
  return rows
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const rows = parseCsv(text)
  if (rows.length === 0) return { headers: [], rows: [] }
  const headers = rows[0].map((h) => String(h).trim())
  return { headers, rows: rows.slice(1) }
}

/* ------------------------------------------------------------------ */
/* Parquet reading (hyparquet) — OULAD datasets are stored as parquet  */
/* ------------------------------------------------------------------ */

/** Lazily load hyparquet; returns null when unavailable (e.g. not installed). */
async function loadParquetLib() {
  try {
    const h = await import('hyparquet')
    const { compressors } = await import('hyparquet-compressors')
    return { ...h, compressors }
  } catch {
    return null
  }
}

const sanitizeParquetValue = (v) => (typeof v === 'bigint' ? Number(v) : v)

/**
 * Read a small parquet file into { headers, rows } (rows are arrays).
 * Returns null when the file cannot be read.
 */
async function readParquet(pq, filePath) {
  try {
    const raw = await pq.parquetReadObjects({
      file: await pq.asyncBufferFromFile(filePath),
      compressors: pq.compressors,
    })
    if (raw.length === 0) return { headers: [], rows: [] }
    const headers = Object.keys(raw[0])
    const rows = raw.map((r) => headers.map((h) => sanitizeParquetValue(r[h])))
    return { headers, rows }
  } catch {
    return null
  }
}

/**
 * Stream-aggregate a large parquet column without materializing all rows.
 * Returns { totalRows, unique, sum } for the requested numeric/string column.
 */
async function parquetColumnStats(pq, filePath, column, { unique = false, sum = false } = {}) {
  const seen = unique ? new Set() : null
  let total = 0
  let totalSum = 0
  await pq.parquetRead({
    file: await pq.asyncBufferFromFile(filePath),
    compressors: pq.compressors,
    columns: [column],
    rowFormat: 'array',
    onChunk: ({ columnData }) => {
      for (const v of columnData) {
        const n = sanitizeParquetValue(v)
        total += 1
        if (unique) seen.add(n)
        if (sum && typeof n === 'number' && Number.isFinite(n)) totalSum += n
      }
    },
  })
  return { totalRows: total, unique: seen ? seen.size : null, sum: sum ? totalSum : null }
}

/** List CSV + parquet files in a directory. */
function listDataFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(csv|parquet)$/i.test(e.name))
    .map((e) => path.join(dir, e.name))
}

/* ------------------------------------------------------------------ */
/* Column detection helpers                                            */
/* ------------------------------------------------------------------ */
const norm = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

/** Returns the ORIGINAL header name matching any alias (case-insensitive), or null. */
function findColumn(headers, aliases) {
  const aliasSet = new Set(aliases.map(norm))
  for (const h of headers) if (aliasSet.has(norm(h))) return h
  return null
}

const toNum = (v) => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '' || s.toLowerCase() === 'nan' || s.toLowerCase() === 'null') return null
  const n = Number(s.replace(/[,$%\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

const toDateKey = (v) => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === '' || /nan/i.test(s)) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0)
const mean = (arr) => (arr.length ? sum(arr) / arr.length : null)

/** Group rows by a key column; count rows, or sum a numeric value column when given. */
function groupSum(rows, keyIdx, valueIdx) {
  const map = new Map()
  for (const r of rows) {
    const key = String(r[keyIdx] ?? '').trim()
    if (!key || key.toLowerCase() === 'nan') continue
    const val = valueIdx === null ? 1 : toNum(r[valueIdx])
    if (val === null) continue
    map.set(key, (map.get(key) ?? 0) + val)
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

/** Build a per-day series from rows using a date column and a numeric column. */
function dailySeries(rows, dateIdx, valueIdx) {
  const map = new Map()
  for (const r of rows) {
    const date = toDateKey(r[dateIdx])
    const val = valueIdx === null ? 1 : toNum(r[valueIdx])
    if (!date || val === null) continue
    map.set(date, (map.get(date) ?? 0) + val)
  }
  return [...map.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

/* ------------------------------------------------------------------ */
/* Dataset role detection                                              */
/* ------------------------------------------------------------------ */
function listCsvs(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.csv$/i.test(e.name))
    .map((e) => path.join(dir, e.name))
}

function listSubdirs(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(dir, e.name))
}

/* ------------------------------------------------------------------ */
/* Aggregators per dataset role                                        */
/* ------------------------------------------------------------------ */

function aggregateStudentDropout(headers, rows) {
  const summary = {
    totalStudents: rows.length,
    statusCounts: null,
    dropoutRatePct: null,
    graduateRatePct: null,
    courseCounts: null,
    series: null,
  }

  const statusCol = findColumn(headers, ['target', 'status', 'student_status', 'enrollment_status', 'final_status', 'outcome', 'result', 'dropout'])
  if (statusCol) {
    const idx = headers.indexOf(statusCol)
    const counts = { Graduate: 0, Dropout: 0, Enrolled: 0 }
    const targetIsBinary = /^(target|dropout)$/.test(norm(statusCol))
    for (const r of rows) {
      const raw = String(r[idx] ?? '').trim().toLowerCase()
      let bucket = null
      if (targetIsBinary) {
        if (raw === '1' || raw === 'graduate') bucket = 'Graduate'
        else if (raw === '0' || raw === 'dropout') bucket = 'Dropout'
        else if (raw === 'enrolled') bucket = 'Enrolled'
      } else if (/graduat/.test(raw)) bucket = 'Graduate'
      else if (/drop/.test(raw)) bucket = 'Dropout'
      else if (/enroll/.test(raw)) bucket = 'Enrolled'
      if (bucket) counts[bucket] += 1
    }
    const recognized = counts.Graduate + counts.Dropout + counts.Enrolled
    if (recognized > 0) {
      summary.statusCounts = counts
      summary.dropoutRatePct = Number(((counts.Dropout / recognized) * 100).toFixed(2))
      summary.graduateRatePct = Number(((counts.Graduate / recognized) * 100).toFixed(2))
    }
  }

  const courseCol = findColumn(headers, ['course', 'course_name', 'class', 'degree', 'program', 'branch', 'module'])
  if (courseCol) {
    const idx = headers.indexOf(courseCol)
    const counts = new Map()
    for (const r of rows) {
      const key = String(r[idx] ?? '').trim()
      if (key && key.toLowerCase() !== 'nan') counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    summary.courseCounts = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }

  const dateCol = findColumn(headers, ['application_date', 'admission_date', 'enrollment_date', 'registration_date', 'date', 'created_at', 'timestamp', 'apply_date'])
  if (dateCol) {
    const idx = headers.indexOf(dateCol)
    const series = dailySeries(rows, idx, null)
    if (series.length > 0) summary.series = series
  }

  return summary
}

function aggregateStudentPerformance(headers, rows) {
  const summary = { performance: null, subjectMeans: null, meanScore: null }

  const scoreCol = findColumn(headers, ['g3', 'exam_score', 'marks', 'percentage', 'score', 'final_score', 'total', 'grade_percentage', 'cgpa', 'gpa', 'average'])
  if (scoreCol) {
    const idx = headers.indexOf(scoreCol)
    const rawValues = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    // Normalize the score scale to 0–100 (e.g. UCI grades are 0–20).
    const maxRaw = rawValues.length ? Math.max(...rawValues) : 0
    const scale = maxRaw <= 10 ? 10 : maxRaw <= 20 ? 5 : 1
    const values = rawValues.map((v) => v * scale)
    if (values.length > 0) {
      const buckets = [
        { bucket: '0–40', count: 0 },
        { bucket: '40–60', count: 0 },
        { bucket: '60–75', count: 0 },
        { bucket: '75–90', count: 0 },
        { bucket: '90–100', count: 0 },
      ]
      for (const v of values) {
        if (v < 40) buckets[0].count += 1
        else if (v < 60) buckets[1].count += 1
        else if (v < 75) buckets[2].count += 1
        else if (v < 90) buckets[3].count += 1
        else buckets[4].count += 1
      }
      summary.performance = buckets
      summary.meanScore = Number(mean(values).toFixed(2))
    }
  }

  // Subject comparison: means of all numeric columns that are not ids/status.
  const skip = new Set([
    'id', 'student_id', 'studentid', 'user_id', 'userid', 'roll', 'roll_no', 'rollno', 'index', 'record_id',
    'name', 'status', 'target', 'result', 'grade', 'g1', 'g2', 'g3', 'exam_score', 'marks', 'percentage', 'score', 'final_score',
  ])
  const numericCols = headers.filter((h) => {
    if (skip.has(norm(h))) return false
    const idx = headers.indexOf(h)
    return rows.some((r) => toNum(r[idx]) !== null)
  })
  if (numericCols.length > 0) {
    const means = numericCols
      .map((h) => {
        const idx = headers.indexOf(h)
        const vals = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
        return { name: h, mean: Number(mean(vals).toFixed(2)), count: vals.length }
      })
      .filter((m) => m.count > 0)
      .sort((a, b) => b.mean - a.mean)
    if (means.length > 0) summary.subjectMeans = means
  }

  return summary
}

async function aggregateOulad(dirPath, pq) {
  const summary = {
    courseCount: null,
    courseCounts: null,
    registrations: null,
    uniqueStudents: null,
    assessmentCount: null,
    registrationSeries: null,
    studentVle: null,
    courseCatalog: null,
    error: null,
  }
  const registrationsByModule = new Map() // `${module}|${presentation}` -> row count
  const rawCourses = [] // module/presentation/length rows (catalog built after the loop)
  const files = listDataFiles(dirPath)

  for (const f of files) {
    const base = path.basename(f).toLowerCase()
    if (process.env.DEBUG_DATASETS) console.log('[oulad]', base)
    let data = null
    if (/\.parquet$/i.test(f)) {
      if (!pq) {
        summary.error = 'OULAD parquet files present but no parquet reader available (install hyparquet).'
        continue
      }
      if (/studentvle|click/.test(base)) {
        if (process.env.DEBUG_DATASETS) console.log('[oulad] streaming', base)
        try {
          const studentStats = await parquetColumnStats(pq, f, 'id_student', { unique: true })
          if (process.env.DEBUG_DATASETS) console.log('[oulad] id_student done')
          const siteStats = await parquetColumnStats(pq, f, 'id_site', { unique: true })
          const clickStats = await parquetColumnStats(pq, f, 'sum_click', { sum: true })
          summary.studentVle = {
            totalRows: studentStats.totalRows,
            uniqueStudents: studentStats.unique,
            uniqueSites: siteStats.unique,
            totalClicks: clickStats.sum,
          }
        } catch {
          summary.studentVle = null
        }
        continue
      }
      data = await readParquet(pq, f)
    } else {
      data = readCsv(f)
    }
    if (!data) continue
    const { headers, rows } = data

    if (base.includes('course')) {
      summary.courseCount = rows.length
      const codeCol = findColumn(headers, ['code_module', 'module', 'code', 'course', 'course_code'])
      const presCol = findColumn(headers, ['code_presentation', 'presentation', 'semester'])
      const lenCol = findColumn(headers, ['module_presentation_length', 'length', 'duration'])
      if (codeCol) {
        const idx = headers.indexOf(codeCol)
        const counts = new Map()
        for (const r of rows) {
          const key = String(r[idx] ?? '').trim()
          if (key && key.toLowerCase() !== 'nan') counts.set(key, (counts.get(key) ?? 0) + 1)
          // Course catalog: one record per module + presentation offering.
          rawCourses.push({
            codeModule: key || null,
            codePresentation: presCol !== null ? String(r[headers.indexOf(presCol)] ?? '').trim() || null : null,
            length: lenCol !== null ? String(r[headers.indexOf(lenCol)] ?? '').trim() : null,
          })
        }
        summary.courseCounts = [...counts.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      }
    } else if (base.includes('registr')) {
      summary.registrations = rows.length
      const studentCol = findColumn(headers, ['id_student', 'student', 'student_id', 'id'])
      if (studentCol) {
        const idx = headers.indexOf(studentCol)
        summary.uniqueStudents = new Set(rows.map((r) => String(r[idx] ?? '').trim()).filter((s) => s && s !== 'nan')).size
      }
      const courseCol = findColumn(headers, ['code_module', 'module', 'course'])
      const presCol = findColumn(headers, ['code_presentation', 'presentation', 'semester'])
      if (courseCol) {
        const idx = headers.indexOf(courseCol)
        const pIdx = presCol !== null ? headers.indexOf(presCol) : null
        for (const r of rows) {
          const key = String(r[idx] ?? '').trim()
          if (key && key.toLowerCase() !== 'nan') {
            const pair = pIdx !== null ? `${key}|${String(r[pIdx] ?? '').trim()}` : key
            registrationsByModule.set(pair, (registrationsByModule.get(pair) ?? 0) + 1)
          }
        }
        if (!summary.courseCounts) {
          summary.courseCounts = groupSum(rows, idx, null).map((g) => ({ name: g.name, count: g.count }))
        }
      }
      // NOTE: OULAD registration dates are relative day offsets (e.g. -159),
      // not calendar dates — no absolute series is fabricated from them.
    } else if (base.includes('assess')) {
      summary.assessmentCount = rows.length
    }
  }

  // Build the catalog after ALL files are read so per-module registration
  // counts are available regardless of file processing order.
  if (rawCourses.length > 0) {
    summary.courseCatalog = rawCourses.map((c) => {
      const pair = c.codePresentation ? `${c.codeModule}|${c.codePresentation}` : c.codeModule
      return { ...c, registrations: registrationsByModule.get(pair) ?? null }
    })
  }

  return summary
}

function aggregateOnlineEngagement(headers, rows) {
  const summary = { totalStudyHours: null, meanStudyHours: null, totalLogins: null, meanLogins: null, series: null }

  const hoursCol = findColumn(headers, ['study_hours', 'study_hours_weekly', 'hours_studied', 'study_time', 'hours', 'learning_hours', 'total_study_hours', 'weekly_study_hours'])
  if (hoursCol) {
    const idx = headers.indexOf(hoursCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) {
      summary.totalStudyHours = Number(sum(values).toFixed(2))
      summary.meanStudyHours = Number(mean(values).toFixed(2))
    }
  }

  const loginCol = findColumn(headers, ['logins', 'login_count', 'login_frequency', 'login_frequency_weekly', 'sessions', 'total_logins', 'logins_count', 'login', 'login_attempts'])
  if (loginCol) {
    const idx = headers.indexOf(loginCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) {
      summary.totalLogins = sum(values)
      summary.meanLogins = Number(mean(values).toFixed(2))
    }
  }

  const dateCol = findColumn(headers, ['date', 'day', 'activity_date', 'login_date', 'timestamp', 'week_date'])
  if (dateCol) {
    const idx = headers.indexOf(dateCol)
    const series = dailySeries(rows, idx, loginCol ? headers.indexOf(loginCol) : null)
    if (series.length > 0) summary.series = series
  }

  return summary
}

function aggregateMarketing(headers, rows) {
  const summary = {
    totalLeads: null,
    qualifiedLeads: null,
    // Human-readable rule used to derive qualifiedLeads when the dataset has
    // no explicit qualification column (emitted into the manifest so the UI
    // can label the metric honestly).
    qualifiedLeadsDefinition: null,
    totalEnrollments: null,
    // Open applications in progress (applications that have not converted to
    // enrollment yet) — the real active-opportunity concept in this funnel.
    activeOpportunities: null,
    activeOpportunitiesDefinition: null,
    totalSpend: null,
    totalClicks: null,
    totalImpressions: null,
    totalRevenue: null,
    roas: null,
    cac: null,
    totalApplications: null,
    channels: null,
    campaigns: null,
    spendSource: null,
    series: { leads: null, enrollments: null, applications: null, spend: null },
  }

  const leadCol = findColumn(headers, ['leads', 'lead_count', 'leads_generated', 'new_leads', 'inquiries', 'enquiries', 'lead'])
  if (leadCol) {
    const idx = headers.indexOf(leadCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) summary.totalLeads = sum(values)
  }

  const qualifiedCol = findColumn(headers, ['qualified', 'qualified_leads', 'qualified_lead_count', 'mql', 'sql'])
  if (qualifiedCol) {
    const idx = headers.indexOf(qualifiedCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) {
      summary.qualifiedLeads = sum(values)
      summary.qualifiedLeadsDefinition =
        'Direct qualified-lead field in the Education Marketing Dataset'
    }
  }

  const enrollCol = findColumn(headers, ['enrollments', 'enrollment', 'enrollments_count', 'conversions', 'converted', 'students_enrolled', 'new_students', 'enrolled'])
  if (enrollCol) {
    const idx = headers.indexOf(enrollCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) summary.totalEnrollments = sum(values)
  }

  // Applications form a distinct funnel stage between leads and enrollments.
  // When the dataset has no explicit qualification field, applications are the
  // real high-intent action a lead can take, so Qualified Leads is derived as
  // “leads that submitted an application”. This is a documented rule over real
  // columns only — never a fabricated number. (Verified: per-row applications
  // ≤ leads in the connected dataset, so Σ applications is a consistent subset
  // of Total Leads.)
  const applicationsCol = findColumn(headers, ['applications', 'applications_count', 'application_count'])
  if (applicationsCol) {
    const idx = headers.indexOf(applicationsCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) summary.totalApplications = sum(values)
    if (summary.qualifiedLeads === null && summary.totalApplications !== null) {
      summary.qualifiedLeads = summary.totalApplications
      summary.qualifiedLeadsDefinition =
        'Leads that submitted an application (applications column) — Education Marketing Dataset'
    }
  }

  // Active Opportunities = qualified leads still in progress (submitted an
  // application but not yet enrolled). Derived from real funnel columns only:
  // qualified leads − enrollments, clamped at 0. In this dataset qualified
  // leads = applications, so the metric is applications − enrollments; the
  // formula is anchored to the qualified count so it stays correct even when
  // an explicit qualification column is present. The connected dataset is
  // strictly ordered (applications ≥ enrollments per row, verified), so this
  // is a real open-pipeline metric — never a fabricated number.
  if (summary.qualifiedLeads !== null && summary.totalEnrollments !== null) {
    summary.activeOpportunities = Math.max(0, summary.qualifiedLeads - summary.totalEnrollments)
    summary.activeOpportunitiesDefinition =
      'Qualified leads still in progress (qualified leads − enrollments) — Education Marketing Dataset'
  }

  // Actual spend columns take priority over planned `budget` columns.
  const spendCol = findColumn(headers, ['cost', 'adspend', 'ad_spend', 'spend', 'amount_spent', 'marketing_spend'])
  const budgetCol = spendCol ? null : findColumn(headers, ['budget', 'ad_budget'])
  const spendSource = spendCol ?? budgetCol
  summary.spendSource = spendCol ? 'cost' : budgetCol ? 'budget' : null
  if (spendSource) {
    const idx = headers.indexOf(spendSource)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) summary.totalSpend = sum(values)
  }

  const clicksCol = findColumn(headers, ['clicks', 'click_count', 'ad_clicks', 'link_clicks'])
  if (clicksCol) {
    const idx = headers.indexOf(clicksCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) summary.totalClicks = sum(values)
  }

  const impressionsCol = findColumn(headers, ['impressions', 'reach', 'views', 'ad_impressions', 'impressions_count'])
  if (impressionsCol) {
    const idx = headers.indexOf(impressionsCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) summary.totalImpressions = sum(values)
  }

  const revenueCol = findColumn(headers, ['revenue', 'sales', 'income', 'gross_revenue', 'revenue_generated', 'profit', 'turnover'])
  if (revenueCol) {
    const idx = headers.indexOf(revenueCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) summary.totalRevenue = sum(values)
  }

  // Derived metrics — only when mathematically supported by real columns.
  const roasCol = findColumn(headers, ['roas', 'return_on_ad_spend', 'roi'])
  if (roasCol) {
    const idx = headers.indexOf(roasCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) summary.roas = Number(mean(values).toFixed(2))
  } else if (summary.totalRevenue !== null && summary.totalSpend && summary.totalSpend > 0) {
    summary.roas = Number((summary.totalRevenue / summary.totalSpend).toFixed(2))
  }

  const cacCol = findColumn(headers, ['cac', 'customer_acquisition_cost', 'cost_per_acquisition', 'cost_per_lead'])
  if (cacCol) {
    const idx = headers.indexOf(cacCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) summary.cac = Number(mean(values).toFixed(2))
  }

  const channelCol = findColumn(headers, ['channel', 'platform', 'campaign_channel', 'source', 'ad_channel', 'marketing_channel', 'channel_name'])
  if (channelCol) {
    const cIdx = headers.indexOf(channelCol)
    const cols = {
      leads: leadCol ? headers.indexOf(leadCol) : null,
      enrollments: enrollCol ? headers.indexOf(enrollCol) : null,
      spend: spendCol ? headers.indexOf(spendCol) : null,
      clicks: clicksCol ? headers.indexOf(clicksCol) : null,
      impressions: impressionsCol ? headers.indexOf(impressionsCol) : null,
    }
    const map = new Map()
    for (const r of rows) {
      const key = String(r[cIdx] ?? '').trim()
      if (!key || key.toLowerCase() === 'nan') continue
      const entry = map.get(key) ?? { name: key, leads: null, enrollments: null, spend: null, clicks: null, impressions: null }
      for (const [k, idx] of Object.entries(cols)) {
        if (idx === null) continue
        const v = toNum(r[idx])
        if (v === null) continue
        entry[k] = (entry[k] ?? 0) + v
      }
      map.set(key, entry)
    }
    summary.channels = [...map.values()]
      .filter((c) => (c.leads ?? 0) + (c.enrollments ?? 0) + (c.spend ?? 0) + (c.clicks ?? 0) + (c.impressions ?? 0) > 0)
      .sort((a, b) => (b.leads ?? 0) - (a.leads ?? 0))
  }

  const campaignCol = findColumn(headers, ['campaign', 'campaign_name', 'campaignname', 'ad_campaign', 'campaign_id'])
  if (campaignCol) {
    const cIdx = headers.indexOf(campaignCol)
    const cols = {
      leads: leadCol ? headers.indexOf(leadCol) : null,
      enrollments: enrollCol ? headers.indexOf(enrollCol) : null,
      spend: spendCol ? headers.indexOf(spendCol) : null,
    }
    const map = new Map()
    for (const r of rows) {
      const key = String(r[cIdx] ?? '').trim()
      if (!key || key.toLowerCase() === 'nan') continue
      const entry = map.get(key) ?? { name: key, leads: null, enrollments: null, spend: null }
      for (const [k, idx] of Object.entries(cols)) {
        if (idx === null) continue
        const v = toNum(r[idx])
        if (v === null) continue
        entry[k] = (entry[k] ?? 0) + v
      }
      map.set(key, entry)
    }
    summary.campaigns = [...map.values()].sort((a, b) => (b.leads ?? 0) - (a.leads ?? 0)).slice(0, 10)
  }

  const dateCol = findColumn(headers, ['date', 'campaign_date', 'start_date', 'ad_date', 'day', 'period_start'])
  if (dateCol) {
    const dIdx = headers.indexOf(dateCol)
    summary.series.leads = leadCol ? dailySeries(rows, dIdx, headers.indexOf(leadCol)) : dailySeries(rows, dIdx, null)
    summary.series.enrollments = enrollCol ? dailySeries(rows, dIdx, headers.indexOf(enrollCol)) : null
    summary.series.applications = applicationsCol ? dailySeries(rows, dIdx, headers.indexOf(applicationsCol)) : null
    summary.series.spend = spendCol ? dailySeries(rows, dIdx, headers.indexOf(spendCol)) : null
    if (!summary.series.leads || summary.series.leads.length === 0) summary.series.leads = null
  }

  return summary
}

function aggregateMlDropoutPrediction(dirPath) {
  const files = listCsvs(dirPath)
  const result = { available: false, totalPredictions: null, riskDistribution: null, meanProbability: null }
  if (files.length === 0) return result

  const { headers, rows } = readCsv(files[0])
  result.available = true
  result.totalPredictions = rows.length

  const riskCol = findColumn(headers, ['prediction', 'predicted', 'predicted_label', 'risk_level', 'risk', 'prediction_label', 'label', 'class'])
  if (riskCol) {
    const idx = headers.indexOf(riskCol)
    const counts = new Map()
    for (const r of rows) {
      const raw = String(r[idx] ?? '').trim().toLowerCase()
      if (!raw || raw === 'nan') continue
      let key = raw
      if (raw === '0' || raw === 'not_at_risk' || raw === 'no_risk' || raw === 'graduate') key = 'Low risk'
      else if (raw === '1' || raw === 'at_risk' || raw === 'risk' || raw === 'dropout') key = 'At risk'
      else if (raw === 'high') key = 'High'
      else if (raw === 'medium' || raw === 'moderate') key = 'Medium'
      else if (raw === 'low') key = 'Low'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    if (counts.size > 0) {
      result.riskDistribution = [...counts.entries()].map(([risk, count]) => ({ risk, count })).sort((a, b) => b.count - a.count)
    }
  }

  const probCol = findColumn(headers, ['probability', 'score', 'proba', 'confidence', 'prediction_probability', 'risk_score'])
  if (probCol) {
    const idx = headers.indexOf(probCol)
    const values = rows.map((r) => toNum(r[idx])).filter((v) => v !== null)
    if (values.length > 0) result.meanProbability = Number(mean(values).toFixed(4))
  }

  return result
}

/* ------------------------------------------------------------------ */
/* Record-level files (real rows shipped to the browser)               */
/* ------------------------------------------------------------------ */

function buildMarketingLeadRecords() {
  return marketingRecords.map((r, i) => {
    const meta = r.campaignId ? (campaignMetaMap.get(String(r.campaignId).trim()) ?? null) : null
    return {
      id: `mkt-${i + 1}`,
      date: r.date ?? null,
      campaignId: r.campaignId ?? null,
      campaignName: r.campaignName ?? null,
      campaignType: meta?.campaignType ?? null,
      platform: r.platform ?? null,
      region: r.region ?? null,
      targetAudience: r.targetAudience ?? null,
      impressions: toNum(r.impressions),
      clicks: toNum(r.clicks),
      leads: toNum(r.leads),
      applications: toNum(r.applications),
      enrollments: toNum(r.enrollments),
      cost: toNum(r.cost),
      revenue: toNum(r.revenue),
    }
  })
}

function buildStudentRecords() {
  return studentRecords.map((r, i) => ({
    id: `stu-${i + 1}`,
    course: r.course ?? null,
    gender: r.gender ?? null,
    age: toNum(r.age),
    admissionGrade: toNum(r.admissionGrade),
    scholarship: toNum(r.scholarship),
    attendance: r.attendance ?? null,
    maritalStatus: r.maritalStatus ?? null,
    status: r.status ?? null,
  }))
}

function buildCourseRecords() {
  return ouladCourseCatalog.map((c, i) => ({
    id: `course-${i + 1}`,
    codeModule: c.codeModule ?? null,
    codePresentation: c.codePresentation ?? null,
    length: toNum(c.length),
    registrations: toNum(c.registrations),
  }))
}

/** Write a records file (empty array when no datasets are available). */
function writeRecordsFile(name, records) {
  fs.mkdirSync(RECORDS_DIR, { recursive: true })
  fs.writeFileSync(path.join(RECORDS_DIR, `${name}.json`), JSON.stringify(records), 'utf8')
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */
function labelForDir(dirName) {
  const n = dirName.toLowerCase()
  if (n.includes('dropout')) return 'Student Dropout Dataset'
  if (n.includes('performance')) return 'Student Performance Dataset'
  if (n.includes('oulad')) return 'OULAD Dataset'
  if (n.includes('engagement')) return 'Online Engagement Dataset'
  if (n.includes('marketing')) return 'Education Marketing Dataset'
  return dirName
}

async function main() {
  const pq = await loadParquetLib()
  const status = {
    available: false,
    generatedAt: new Date().toISOString(),
    datasets: [],
    aggregates: {
      kpis: {
        totalStudents: null,
        dropoutRatePct: null,
        graduateRatePct: null,
        totalLeads: null,
        qualifiedLeads: null,
        qualifiedLeadsDefinition: null,
        totalApplications: null,
        activeOpportunities: null,
        activeOpportunitiesDefinition: null,
        enrollmentConversionPct: null,
        courseEnrollments: null,
        revenue: null,
        adSpend: null,
        clicks: null,
        impressions: null,
        cac: null,
        roas: null,
      },
      series: { leads: [], enrollments: [], applications: [], registrations: [], students: [], engagement: [], spend: [] },
      distributions: {},
      engagement: { totalStudyHours: null, totalLogins: null, meanStudyHours: null },
    },
    ml: { dropoutPrediction: { available: false, totalPredictions: null, riskDistribution: null, meanProbability: null } },
    message: null,
  }

  const kpis = status.aggregates.kpis
  const series = status.aggregates.series
  const distributions = status.aggregates.distributions
  const engagement = status.aggregates.engagement

  if (fs.existsSync(DATA_DIR)) {
    const cleanedDir = path.join(DATA_DIR, 'cleaned')
    if (fs.existsSync(cleanedDir)) {
      for (const sub of listSubdirs(cleanedDir)) {
        const dirName = path.basename(sub)
        const label = labelForDir(dirName)
        const files = listDataFiles(sub)
        if (files.length === 0) continue

        status.available = true
        const info = { id: dirName, label, path: path.relative(ROOT, sub), rows: 0, columns: [], hasDates: false, error: null }
        const n = dirName.toLowerCase()

        for (const file of files) {
          // The large OULAD clickstream file is aggregated (streamed) in
          // aggregateOulad — materializing it here would exhaust memory.
          if (/studentvle|clickstream|vle_click/.test(path.basename(file).toLowerCase())) continue
          let data = null
          try {
            data = /\.parquet$/i.test(file) ? (pq ? await readParquet(pq, file) : null) : readCsv(file)
          } catch {
            data = null
          }
          if (!data) {
            info.error = info.error ?? `One or more files could not be read (corrupt or unsupported format).`
            continue
          }
          const { headers, rows } = data
          info.rows += rows.length
          info.columns = [...new Set([...info.columns, ...headers])]

          if (n.includes('dropout')) {
            const s = aggregateStudentDropout(headers, rows)
            if (s.totalStudents > 0) kpis.totalStudents = s.totalStudents
            if (s.statusCounts) {
              distributions.enrollmentStatus = s.statusCounts
              kpis.dropoutRatePct = s.dropoutRatePct
              kpis.graduateRatePct = s.graduateRatePct
            }
            if (s.courseCounts) distributions.courses = s.courseCounts
            if (s.series) {
              series.students = mergeSeries(series.students, s.series)
              info.hasDates = true
            }
            // Privacy-safe row-level records: real attributes, no personal
            // identifiers (this dataset contains none) — row index as id.
            const sCourse = findColumn(headers, ['course', 'course_code', 'module'])
            const sGender = findColumn(headers, ['gender', 'sex'])
            const sAge = findColumn(headers, ['age', 'age_at_enrollment', 'age_at_enrolment'])
            const sAdmGrade = findColumn(headers, ['admission_grade', 'admissiongrade', 'entry_grade'])
            const sScholarship = findColumn(headers, ['scholarship_holder', 'scholarship'])
            const sAttendance = findColumn(headers, ['daytime_evening_attendance', 'attendance_mode'])
            const sMarital = findColumn(headers, ['marital_status', 'maritalstatus'])
            const sStatus = findColumn(headers, ['target', 'status', 'student_status', 'enrollment_status', 'final_status', 'outcome', 'result'])
            for (const r of rows) {
              studentRecords.push({
                course: sCourse !== null ? String(r[headers.indexOf(sCourse)] ?? '').trim() : null,
                gender: sGender !== null ? String(r[headers.indexOf(sGender)] ?? '').trim() : null,
                age: sAge !== null ? String(r[headers.indexOf(sAge)] ?? '').trim() : null,
                admissionGrade: sAdmGrade !== null ? String(r[headers.indexOf(sAdmGrade)] ?? '').trim() : null,
                scholarship: sScholarship !== null ? String(r[headers.indexOf(sScholarship)] ?? '').trim() : null,
                attendance: sAttendance !== null ? String(r[headers.indexOf(sAttendance)] ?? '').trim() : null,
                maritalStatus: sMarital !== null ? String(r[headers.indexOf(sMarital)] ?? '').trim() : null,
                status: sStatus !== null ? String(r[headers.indexOf(sStatus)] ?? '').trim() : null,
              })
            }
          } else if (n.includes('performance')) {
            const s = aggregateStudentPerformance(headers, rows)
            if (s.performance) distributions.performance = s.performance
            if (s.subjectMeans) distributions.subjectMeans = s.subjectMeans
            if (s.meanScore !== null) kpis.meanScore = s.meanScore
          } else if (n.includes('engagement')) {
            const s = aggregateOnlineEngagement(headers, rows)
            if (s.totalStudyHours !== null) engagement.totalStudyHours = s.totalStudyHours
            if (s.meanStudyHours !== null) engagement.meanStudyHours = s.meanStudyHours
            if (s.totalLogins !== null) engagement.totalLogins = s.totalLogins
            if (s.series) {
              series.engagement = mergeSeries(series.engagement, s.series)
              info.hasDates = true
            }
          } else if (n.includes('marketing')) {
            const s = aggregateMarketing(headers, rows)
            // Real row-level lead records (campaign performance file).
            const mDate = findColumn(headers, ['date', 'campaign_date', 'ad_date', 'day', 'period_start'])
            const mCampaignId = findColumn(headers, ['campaignid', 'campaign_id', 'campaign'])
            const mCampaignName = findColumn(headers, ['campaignname', 'campaign_name', 'campaign'])
            const mPlatform = findColumn(headers, ['platform', 'channel', 'source'])
            const mRegion = findColumn(headers, ['region', 'country', 'geo'])
            const mTarget = findColumn(headers, ['targetaudience', 'audience', 'target_audience'])
            const mImpressions = findColumn(headers, ['impressions', 'impressions_count'])
            const mClicks = findColumn(headers, ['clicks', 'click_count'])
            const mLeads = findColumn(headers, ['leads', 'lead_count', 'total_leads'])
            const mApplications = findColumn(headers, ['applications', 'application_count'])
            const mEnrollments = findColumn(headers, ['enrollments', 'enrollment_count', 'enrolled'])
            const mCost = findColumn(headers, ['cost', 'spend', 'adspend', 'ad_spend'])
            const mRevenue = findColumn(headers, ['revenue', 'sales', 'revenue_generated'])
            const mCampaignType = findColumn(headers, ['campaign_type', 'type'])
            if (mDate && mLeads) {
              for (const r of rows) {
                marketingRecords.push({
                  date: toDateKey(r[headers.indexOf(mDate)]) ?? null,
                  campaignId: mCampaignId !== null ? String(r[headers.indexOf(mCampaignId)] ?? '').trim() : null,
                  campaignName: mCampaignName !== null ? String(r[headers.indexOf(mCampaignName)] ?? '').trim() : null,
                  platform: mPlatform !== null ? String(r[headers.indexOf(mPlatform)] ?? '').trim() : null,
                  region: mRegion !== null ? String(r[headers.indexOf(mRegion)] ?? '').trim() : null,
                  targetAudience: mTarget !== null ? String(r[headers.indexOf(mTarget)] ?? '').trim() : null,
                  impressions: mImpressions !== null ? r[headers.indexOf(mImpressions)] : null,
                  clicks: mClicks !== null ? r[headers.indexOf(mClicks)] : null,
                  leads: r[headers.indexOf(mLeads)],
                  applications: mApplications !== null ? r[headers.indexOf(mApplications)] : null,
                  enrollments: mEnrollments !== null ? r[headers.indexOf(mEnrollments)] : null,
                  cost: mCost !== null ? r[headers.indexOf(mCost)] : null,
                  revenue: mRevenue !== null ? r[headers.indexOf(mRevenue)] : null,
                })
              }
            }
            // Campaign metadata (type) — joined into lead records later.
            if (mCampaignId && mCampaignType) {
              const idIdx = headers.indexOf(mCampaignId)
              const typeIdx = headers.indexOf(mCampaignType)
              for (const r of rows) {
                const id = String(r[idIdx] ?? '').trim()
                if (id) campaignMetaMap.set(id, { campaignType: String(r[typeIdx] ?? '').trim() || null })
              }
            }
            if (s.totalLeads !== null) kpis.totalLeads = s.totalLeads
            if (s.qualifiedLeads !== null) kpis.qualifiedLeads = s.qualifiedLeads
            if (s.qualifiedLeadsDefinition) kpis.qualifiedLeadsDefinition = s.qualifiedLeadsDefinition
            if (s.totalEnrollments !== null) kpis.totalEnrollments = s.totalEnrollments
            if (s.activeOpportunities !== null) kpis.activeOpportunities = s.activeOpportunities
            if (s.activeOpportunitiesDefinition) kpis.activeOpportunitiesDefinition = s.activeOpportunitiesDefinition
            if (s.totalApplications !== null) kpis.totalApplications = s.totalApplications
            if (s.totalSpend !== null && !(s.spendSource === 'budget' && kpis.adSpend !== null)) kpis.adSpend = s.totalSpend
            if (s.totalClicks !== null) kpis.clicks = s.totalClicks
            if (s.totalImpressions !== null) kpis.impressions = s.totalImpressions
            if (s.totalRevenue !== null) kpis.revenue = s.totalRevenue
            if (s.roas !== null) kpis.roas = s.roas
            if (s.cac !== null) kpis.cac = s.cac
            if (s.channels) distributions.channels = s.channels
            if (s.campaigns) distributions.campaigns = s.campaigns
            if (s.series.leads) {
              series.leads = mergeSeries(series.leads, s.series.leads)
              info.hasDates = true
            }
            if (s.series.enrollments) series.enrollments = mergeSeries(series.enrollments, s.series.enrollments)
            if (s.series.applications) series.applications = mergeSeries(series.applications, s.series.applications)
            if (s.series.spend) series.spend = mergeSeries(series.spend, s.series.spend)
          }
        }

        // OULAD is a directory-level aggregation — run it exactly once, after
        // the per-file loop, so series are never double-counted.
        if (n.includes('oulad')) {
          const s = await aggregateOulad(sub, pq)
          if (s.error && !info.error) info.error = s.error
          if (s.courseCount !== null) kpis.totalCourses = s.courseCount
          if (s.courseCounts && !distributions.courses) distributions.courses = s.courseCounts
          if (s.registrations !== null) {
            kpis.courseEnrollments = s.registrations
          }
          if (s.uniqueStudents !== null) kpis.uniqueStudents = s.uniqueStudents
          if (s.assessmentCount !== null) kpis.totalAssessments = s.assessmentCount
          if (s.registrationSeries) {
            series.registrations = mergeSeries(series.registrations, s.registrationSeries)
            info.hasDates = true
          }
          if (s.studentVle) distributions.studentVle = s.studentVle
          if (s.courseCatalog) ouladCourseCatalog = s.courseCatalog
        }

        status.datasets.push(info)
      }
    }

    // Enrollment conversion: prefer marketing leads→enrollments, else dropout status share.
    if (kpis.totalLeads !== null && kpis.totalLeads > 0 && kpis.totalEnrollments !== null) {
      kpis.enrollmentConversionPct = Number(((kpis.totalEnrollments / kpis.totalLeads) * 100).toFixed(2))
    } else if (distributions.enrollmentStatus) {
      const { Graduate = 0, Enrolled = 0, Dropout = 0 } = distributions.enrollmentStatus
      const total = Graduate + Enrolled + Dropout
      if (total > 0) kpis.enrollmentConversionPct = Number((((Graduate + Enrolled) / total) * 100).toFixed(2))
    }

    // Active Opportunities is derived in aggregateMarketing from real funnel
    // columns (qualified leads − enrollments, clamped at 0) and emitted above
    // via activeOpportunities + activeOpportunitiesDefinition — it is never
    // fabricated. When the marketing dataset lacks the required columns it
    // stays null (→ "N/A" in the UI) and real enrollments are still reported
    // via totalEnrollments / the funnel.

    // ML-ready outputs.
    const mlReadyDir = path.join(DATA_DIR, 'ml_ready')
    if (fs.existsSync(mlReadyDir)) {
      const predictionDir = path.join(mlReadyDir, 'dropout_prediction')
      if (fs.existsSync(predictionDir)) {
        status.ml.dropoutPrediction = aggregateMlDropoutPrediction(predictionDir)
        if (status.ml.dropoutPrediction.available) status.available = true
      }
    }
  }

  if (!status.available) {
    status.message =
      'No Member 1 dataset found under data/cleaned/. Add the CSV datasets (01_student_performance, 02_student_dropout, 03_oulad, 04_online_engagement, 05_education_marketing) and ML outputs under data/ml_ready/, then re-run npm run data:aggregate.'
  }

  // Row-level records (real rows) — written regardless so the UI can show an
  // honest empty state when no datasets are connected.
  writeRecordsFile('leads', buildMarketingLeadRecords())
  writeRecordsFile('students', buildStudentRecords())
  writeRecordsFile('courses', buildCourseRecords())

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, JSON.stringify(status, null, 2), 'utf8')

  console.log(
    `[data:aggregate] records: ${buildMarketingLeadRecords().length} marketing / ${buildStudentRecords().length} students / ${buildCourseRecords().length} courses`,
  )

  const datasetSummary =
    status.datasets.length > 0
      ? status.datasets.map((d) => `  - ${d.label} (${d.rows.toLocaleString()} rows, ${d.columns.length} cols)`)
      : '  (none found)'
  console.log(`[data:aggregate] wrote ${path.relative(ROOT, OUT_FILE)}`)
  console.log(`[data:aggregate] datasets available: ${status.available}`)
  console.log(datasetSummary)
}

/** Merge two sorted {date, value} series, summing overlapping dates. */
function mergeSeries(a, b) {
  const map = new Map()
  for (const p of a) map.set(p.date, (map.get(p.date) ?? 0) + p.value)
  for (const p of b) map.set(p.date, (map.get(p.date) ?? 0) + p.value)
  return [...map.entries()].map(([date, value]) => ({ date, value })).sort((x, y) => (x.date < y.date ? -1 : 1))
}

await main()

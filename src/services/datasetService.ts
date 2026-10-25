/**
 * Real-data dashboard service (Member 1 datasets).
 *
 * Fetches the manifest produced by `npm run data:aggregate`
 * (`public/data/datasets.json`) and derives every dashboard KPI, chart and
 * widget from it. Values are computed from real dataset columns only:
 *
 *  - a metric that the dataset cannot support is `null` → shown as "N/A";
 *  - date windows are computed relative to the dataset's own date range
 *    (e.g. "30 Days" = the most recent 30 days present in the data);
 *  - datasets without a date column contribute their full-period totals
 *    regardless of the selected filter (no dates are fabricated).
 *
 * No random or synthetic numbers are ever produced here.
 */
import { apiRequest } from '@/services/authApi'
import type {
  CourseRecord,
  DashboardAggregates,
  DashboardRange,
  DatasetStatus,
  MarketingLeadRecord,
  SeriesAggregates,
  SeriesPoint,
  StudentRecord,
} from '@/types/datasets'
import type {
  AiInsight,
  CoursePerformanceItem,
  DashboardData,
  EnrollmentTrendPoint,
  FunnelStage,
  Kpi,
  KpiAccent,
  KpiIconKey,
  RecentActivityItem,
  RecentLead,
  TrendPoint,
} from '@/types/dashboard'

export interface DashboardPayload extends DashboardData {
  datasetStatus: DatasetStatus
}

const RANGE_DAYS: Record<DashboardRange, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
}

/* ------------------------------------------------------------------ */
/* Manifest fetching (cached)                                          */
/* ------------------------------------------------------------------ */

let manifestPromise: Promise<DatasetStatus> | null = null

const recordsPromise = new Map<string, Promise<unknown>>()

export function getDatasetManifest(): Promise<DatasetStatus> {
  if (!manifestPromise) {
    manifestPromise = fetch('/data/datasets.json').then((res) => {
      if (!res.ok) {
        throw new Error(
          `Dataset manifest not found (HTTP ${res.status}). Add the Member 1 datasets under data/cleaned/ and data/ml_ready/, then run \`npm run data:aggregate\`.`,
        )
      }
      return res.json() as Promise<DatasetStatus>
    })
  }
  return manifestPromise
}

/** Fetch a row-level records file (real dataset rows, generated at build time). */
export function getDatasetRecords<T extends MarketingLeadRecord | StudentRecord | CourseRecord>(
  kind: 'leads' | 'students' | 'courses',
): Promise<T[]> {
  let promise = recordsPromise.get(kind)
  if (!promise) {
    promise = fetch(`/data/records/${kind}.json`).then((res) => {
      if (!res.ok) {
        throw new Error(`Dataset records (${kind}) not found (HTTP ${res.status}).`)
      }
      return res.json() as Promise<T[]>
    })
    recordsPromise.set(kind, promise)
  }
  return promise as Promise<T[]>
}

/** Drop the cached manifest + records so the next fetch re-reads the real files. */
export function invalidateDatasetManifest(): void {
  manifestPromise = null
  recordsPromise.clear()
}

/* ------------------------------------------------------------------ */
/* Range / series helpers                                              */
/* ------------------------------------------------------------------ */

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const sum = (nums: number[]): number => nums.reduce((a, b) => a + b, 0)

/** Slice a sorted date series to the most recent `days` window (dataset-relative). */
function sliceSeries(
  series: SeriesPoint[],
  days: number | null,
): { points: SeriesPoint[]; prev: number } {
  if (series.length === 0) return { points: [], prev: 0 }
  const end = series[series.length - 1].date
  const start = days === null ? null : shiftDate(end, -(days - 1))
  const points = start === null ? series : series.filter((p) => p.date >= start)
  let prev = 0
  if (start !== null && days !== null) {
    const prevStart = shiftDate(start, -days)
    prev = sum(series.filter((p) => p.date >= prevStart && p.date < start).map((p) => p.value))
  }
  return { points, prev }
}

/** Bucket a series into at most `size` points for sparklines. */
function toSpark(points: SeriesPoint[], size = 12): number[] {
  if (points.length === 0) return []
  if (points.length <= size) return points.map((p) => p.value)
  const step = Math.ceil(points.length / size)
  const out: number[] = []
  for (let i = 0; i < points.length; i += step) {
    out.push(sum(points.slice(i, i + step).map((p) => p.value)))
  }
  return out
}

const fmtInt = (n: number): string => Math.round(n).toLocaleString('en-US')
const fmtPct = (n: number): string => `${n.toFixed(1)}%`
const fmtCompact = (n: number): string =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

interface KpiInput {
  id: string
  label: string
  icon: KpiIconKey
  accent: KpiAccent
  format: (n: number) => string
  value: number | null
  series?: SeriesPoint[]
  days: number | null
  caption?: string
}

function buildKpi(input: KpiInput): Kpi {
  const { id, label, icon, accent, format, days, caption } = input
  if (input.value === null || !Number.isFinite(input.value)) {
    return { id, label, value: 'N/A', delta: 0, accent, icon, spark: [], unavailable: true, caption }
  }
  const series = input.series ?? []
  const { points, prev } = sliceSeries(series, days)
  const windowSum = sum(points.map((p) => p.value))
  const display = series.length > 0 ? windowSum : input.value
  const delta = series.length > 0 && prev > 0 ? ((display - prev) / prev) * 100 : null
  return {
    id,
    label,
    value: format(display),
    delta: delta === null ? 0 : delta,
    deltaAvailable: delta !== null,
    accent,
    icon,
    spark: series.length > 0 ? toSpark(points) : [],
    caption,
  }
}

/** Build trend points for the performance chart from dated series. */
function buildTrend(
  leads: SeriesPoint[],
  enrollments: SeriesPoint[],
  days: number | null,
): TrendPoint[] {
  const dates = [...leads, ...enrollments].map((p) => p.date)
  if (dates.length === 0) return []
  const end = dates.reduce((a, b) => (a > b ? a : b))
  const start =
    days === null ? dates.reduce((a, b) => (a < b ? a : b)) : shiftDate(end, -(days - 1))
  const leadMap = new Map(leads.map((p) => [p.date, p.value]))
  const enrollMap = new Map(enrollments.map((p) => [p.date, p.value]))
  const spanDays =
    (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) /
    (1000 * 60 * 60 * 24)
  const step = Math.max(1, Math.ceil(spanDays / 8))
  const points: TrendPoint[] = []
  let cursor = start
  let guard = 0
  while (cursor <= end && guard < 32) {
    let leadsSum = 0
    let enrollSum = 0
    for (let d = 0; d < step; d++) {
      const day = shiftDate(cursor, d)
      if (day > end) break
      leadsSum += leadMap.get(day) ?? 0
      enrollSum += enrollMap.get(day) ?? 0
    }
    points.push({
      label: `${cursor.slice(5, 7)}/${cursor.slice(8, 10)}`,
      leads: leadsSum,
      qualified: undefined,
      enrollments: enrollSum,
    })
    cursor = shiftDate(cursor, step)
    guard += 1
  }
  return points
}

/**
 * Derive a daily “open applications” series (applications in progress) from
 * the real applications and enrollments series — same date field, subtracted
 * per day and clamped at 0. Never fabricated; empty when either source is
 * missing.
 */
function buildOpenApplicationsSeries(applications: SeriesPoint[], enrollments: SeriesPoint[]): SeriesPoint[] {
  if (applications.length === 0 || enrollments.length === 0) return []
  const enrollMap = new Map(enrollments.map((p) => [p.date, p.value]))
  const out: SeriesPoint[] = []
  for (const p of applications) {
    const enroll = enrollMap.get(p.date) ?? 0
    out.push({ date: p.date, value: Math.max(0, p.value - enroll) })
  }
  return out
}

/** Monthly enrollment buckets for the enrollment-trends bar chart. */
function buildEnrollmentTrends(series: SeriesPoint[]): EnrollmentTrendPoint[] {
  if (series.length === 0) return []
  const map = new Map<string, number>()
  for (const p of series) {
    const month = p.date.slice(0, 7)
    map.set(month, (map.get(month) ?? 0) + p.value)
  }
  const months = [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-12)
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short' })
  return months.map(([month, count]) => ({
    label: fmt.format(new Date(`${month}-01T00:00:00Z`)),
    newEnrollments: count,
    completed: undefined,
    dropoffs: undefined,
  }))
}

/** Windowed count when a dated series exists; otherwise the full total. */
function windowedCount(
  series: SeriesPoint[],
  total: number | null,
  days: number | null,
): number | null {
  if (total === null) return null
  if (series.length === 0) return total
  return sum(sliceSeries(series, days).points.map((p) => p.value))
}

/** Lead funnel from marketing (or dropout status) totals. */
function buildFunnel(
  aggregates: DashboardAggregates,
  days: number | null,
  series: SeriesAggregates,
  enrollSeries: SeriesPoint[],
): FunnelStage[] {
  const { kpis, distributions } = aggregates
  let stages: Array<{ id: string; name: string; count: number }> = []
  if (kpis.totalLeads !== null && kpis.totalLeads > 0) {
    const leads = windowedCount(series.leads, kpis.totalLeads, days)
    const applications = windowedCount(series.applications, kpis.totalApplications, days)
    const enrollments = windowedCount(enrollSeries, kpis.totalEnrollments, days)
    if (leads !== null && leads > 0) stages.push({ id: 'new', name: 'New Leads', count: leads })
    // Applications are a real, distinct stage (lead → application → enrollment).
    if (applications !== null && applications > 0) {
      stages.push({ id: 'application', name: 'Applications', count: applications })
    }
    if (enrollments !== null && enrollments > 0) {
      stages.push({ id: 'enrollment', name: 'Enrollment', count: enrollments })
    }
  } else if (distributions.enrollmentStatus) {
    const { Graduate = 0, Enrolled = 0, Dropout = 0 } = distributions.enrollmentStatus
    const total = Graduate + Enrolled + Dropout
    if (total > 0) {
      stages = [
        { id: 'new', name: 'Total Students', count: total },
        { id: 'enrolled', name: 'Enrolled', count: Graduate + Enrolled },
      ]
    }
  }
  return stages.map((stage, index) => {
    const first = stages[0]?.count ?? 1
    const prev = index === 0 ? first : stages[index - 1].count
    return {
      id: stage.id,
      name: stage.name,
      count: stage.count,
      pctOfTotal: Number(((stage.count / first) * 100).toFixed(1)),
      conversion: Number(((stage.count / prev) * 100).toFixed(1)),
    }
  })
}

/** Top courses from course-level aggregates. */
function buildCourses(aggregates: DashboardAggregates): CoursePerformanceItem[] {
  const counts = aggregates.distributions.courses ?? []
  return counts.slice(0, 6).map((c, i) => ({
    id: `course-${i}`,
    name: c.name,
    enrollments: c.count,
    conversion: undefined,
    revenue: undefined,
    trend: undefined,
  }))
}

/** Factual, source-labeled insights derived from real aggregates. */
function buildInsights(aggregates: DashboardAggregates, ml: DatasetStatus['ml']): AiInsight[] {
  const { kpis, distributions } = aggregates
  const insights: AiInsight[] = []

  if (kpis.totalStudents !== null && kpis.dropoutRatePct !== null) {
    insights.push({
      id: 'dropout-rate',
      icon: kpis.dropoutRatePct > 30 ? 'alert' : 'calendar',
      tone: kpis.dropoutRatePct > 30 ? 'danger' : 'info',
      priority: kpis.dropoutRatePct > 30 ? 'High' : 'Medium',
      title: 'Dropout Rate',
      message: `${fmtPct(kpis.dropoutRatePct)} of ${fmtInt(kpis.totalStudents)} students are flagged as dropouts in the connected Student Dropout Dataset.`,
      actionLabel: 'View Students',
      actionTo: '/students',
    })
  }

  if (kpis.totalLeads !== null) {
    insights.push({
      id: 'marketing-leads',
      icon: 'trending',
      tone: 'success',
      priority: 'Medium',
      title: 'Marketing Pipeline',
      message: `${fmtInt(kpis.totalLeads)} leads${
        kpis.totalEnrollments !== null ? ` and ${fmtInt(kpis.totalEnrollments)} enrollments` : ''
      } recorded in the Education Marketing Dataset.`,
      actionLabel: 'View Campaigns',
      actionTo: '/campaigns',
    })
  }

  // OULAD activity: use the real unique-student count from the registration
  // file (not marketing enrollments, which are a different dataset).
  if (kpis.uniqueStudents !== null && kpis.totalCourses !== null) {
    insights.push({
      id: 'oulad-registrations',
      icon: 'sparkles',
      tone: 'brand',
      priority: 'Low',
      title: 'Course Activity',
      message: `${fmtInt(kpis.uniqueStudents)} unique students registered across ${fmtInt(kpis.totalCourses)} course offerings in the OULAD Dataset.`,
      actionLabel: 'View Courses',
      actionTo: '/courses',
    })
  }

  if (distributions.enrollmentStatus && kpis.totalStudents !== null) {
    const { Graduate = 0, Enrolled = 0 } = distributions.enrollmentStatus
    const engaged = Graduate + Enrolled
    insights.push({
      id: 'enrollment-status',
      icon: 'flame',
      tone: 'warning',
      priority: 'Medium',
      title: 'Enrollment Outcome',
      message: `${fmtInt(engaged)} of ${fmtInt(kpis.totalStudents)} students graduated or are still enrolled in the connected dataset.`,
      actionLabel: 'View Analytics',
      actionTo: '/analytics',
    })
  }

  if (ml.dropoutPrediction.available && ml.dropoutPrediction.totalPredictions !== null) {
    insights.push({
      id: 'ml-dropout-prediction',
      icon: 'sparkles',
      tone: 'brand',
      priority: 'High',
      title: 'Dropout Prediction Output',
      message: `${fmtInt(ml.dropoutPrediction.totalPredictions)} real predictions available${
        ml.dropoutPrediction.meanProbability !== null
          ? ` (mean probability ${ml.dropoutPrediction.meanProbability.toFixed(3)})`
          : ''
      } from Member 1's ML output.`,
      actionLabel: 'View Predictions',
      actionTo: '/predictive-insights',
    })
  }

  return insights.slice(0, 5)
}

/* ------------------------------------------------------------------ */
/* Dashboard assembly                                                  */
/* ------------------------------------------------------------------ */

function buildDashboardData(status: DatasetStatus, range: DashboardRange): DashboardData {
  const days = RANGE_DAYS[range]
  const aggregates = status.aggregates

  if (!status.available || !aggregates) {
    const kpis: Kpi[] = [
      { id: 'total-leads', label: 'Total Leads', value: 'N/A', delta: 0, accent: 'indigo', icon: 'users', spark: [], unavailable: true },
      { id: 'qualified-leads', label: 'Qualified Leads', value: 'N/A', delta: 0, accent: 'violet', icon: 'user-check', spark: [], unavailable: true },
      { id: 'enrollment-conversion', label: 'Enrollment Conversion', value: 'N/A', delta: 0, accent: 'emerald', icon: 'percent', spark: [], unavailable: true },
      { id: 'active-opportunities', label: 'Active Opportunities', value: 'N/A', delta: 0, accent: 'sky', icon: 'briefcase', spark: [], unavailable: true },
      { id: 'total-students', label: 'Total Students', value: 'N/A', delta: 0, accent: 'amber', icon: 'graduation-cap', spark: [], unavailable: true },
      { id: 'revenue-pipeline', label: 'Revenue Pipeline', value: 'N/A', delta: 0, accent: 'rose', icon: 'indian-rupee', spark: [], unavailable: true },
    ]
    return {
      kpis,
      trends: { '30d': [], '90d': [], '6m': [], '1y': [] },
      funnel: [],
      enrollmentTrends: [],
      aiInsights: [],
      recentLeads: [],
      courses: [],
      recentActivity: [],
    }
  }

  const { kpis: agg, series } = aggregates
  // Sales-side enrollments over time; fall back to OULAD registrations when
  // the marketing dataset has no enrollment series (one source at a time —
  // never blended).
  const enrollSeries = series.enrollments.length > 0 ? series.enrollments : series.registrations

  // Enrollment conversion follows the selected range when both dated series
  // exist (e.g. leads→enrollments within the last 30 days); otherwise the
  // full-period conversion is used (no dates are fabricated).
  let conversionValue = agg.enrollmentConversionPct
  if (series.leads.length > 0 && enrollSeries.length > 0) {
    const leadsWindow = sum(sliceSeries(series.leads, days).points.map((p) => p.value))
    const enrollWindow = sum(sliceSeries(enrollSeries, days).points.map((p) => p.value))
    if (leadsWindow > 0) conversionValue = (enrollWindow / leadsWindow) * 100
  }

  const kpis: Kpi[] = [
    buildKpi({
      id: 'total-leads',
      label: 'Total Leads',
      icon: 'users',
      accent: 'indigo',
      format: fmtInt,
      value: agg.totalLeads,
      series: series.leads,
      days,
    }),
    // Qualified Leads = leads that submitted an application (the real
    // high-intent action in the Education Marketing funnel). Derived in the
    // aggregator from the `applications` column — same dataset + date field as
    // Total Leads, so the selected range recalculates it identically.
    buildKpi({
      id: 'qualified-leads',
      label: 'Qualified Leads',
      icon: 'user-check',
      accent: 'violet',
      format: fmtInt,
      value: agg.qualifiedLeads,
      series: series.applications,
      days,
      caption: agg.qualifiedLeadsDefinition ?? undefined,
    }),
    buildKpi({
      id: 'enrollment-conversion',
      label: 'Enrollment Conversion',
      icon: 'percent',
      accent: 'violet', // lavender/purple card per the color system
      format: fmtPct,
      value: conversionValue,
      days,
      caption: 'Calculated for selected range',
    }),
    // Active Opportunities = qualified leads still in progress (qualified −
    // enrollments), derived from the real funnel columns in the aggregator and
    // windowed here against the same date field as Total Leads.
    buildKpi({
      id: 'active-opportunities',
      label: 'Active Opportunities',
      icon: 'briefcase',
      accent: 'sky',
      format: fmtInt,
      value: agg.activeOpportunities,
      series: buildOpenApplicationsSeries(series.applications, series.enrollments),
      days,
      caption: agg.activeOpportunitiesDefinition ?? undefined,
    }),
    buildKpi({
      id: 'total-students',
      label: 'Total Students',
      icon: 'graduation-cap',
      accent: 'amber',
      format: fmtInt,
      value: agg.totalStudents,
      series: series.students,
      days,
    }),
    buildKpi({
      id: 'revenue-pipeline',
      label: 'Revenue Pipeline',
      icon: 'indian-rupee',
      accent: 'rose',
      format: fmtCompact,
      value: agg.revenue,
      days,
    }),
  ]

  return {
    kpis,
    trends: {
      '30d': buildTrend(series.leads, enrollSeries, 30),
      '90d': buildTrend(series.leads, enrollSeries, 90),
      '6m': buildTrend(series.leads, enrollSeries, 180),
      '1y': buildTrend(series.leads, enrollSeries, null),
    },
    funnel: buildFunnel(aggregates, days, series, enrollSeries),
    enrollmentTrends: buildEnrollmentTrends(enrollSeries),
    aiInsights: buildInsights(aggregates, status.ml),
    recentLeads: [] as RecentLead[],
    courses: buildCourses(aggregates),
    recentActivity: [] as RecentActivityItem[],
  }
}

/**
 * Fetch the dashboard for the selected range.
 *
 * Prefers the live backend (`GET /api/dashboard`, computed from the database)
 * and falls back to the real dataset computation when the API is unreachable
 * — so the dashboard is never blank and never shows fake numbers either way.
 */
export async function getDashboardData(range: DashboardRange = '30d'): Promise<DashboardPayload> {
  try {
    return await apiDashboard(range)
  } catch {
    // Backend offline → fall back to the real dataset computation.
    const status = await getDatasetManifest()
    return {
      ...buildDashboardData(status, range),
      datasetStatus: status,
    }
  }
}

/** Dashboard from the live backend, normalized to the frontend payload shape. */
async function apiDashboard(range: DashboardRange): Promise<DashboardPayload> {
  const data = await apiRequest<Omit<DashboardPayload, 'datasetStatus'> & { datasetStatus?: Partial<DatasetStatus> & { datasets?: DatasetStatus['datasets'] } }>(
    `/api/dashboard?range=${range}`,
    { timeoutMs: 5000 },
  )
  const liveDatasets = data.datasetStatus?.datasets ?? [
    { id: 'live-db', label: 'Live EDTECH AI database', path: '', rows: 0, columns: [], hasDates: true },
  ]
  return {
    kpis: data.kpis,
    trends: data.trends,
    funnel: data.funnel,
    enrollmentTrends: data.enrollmentTrends,
    aiInsights: data.aiInsights,
    recentLeads: data.recentLeads,
    courses: data.courses,
    recentActivity: data.recentActivity,
    datasetStatus: {
      available: true,
      generatedAt: null,
      datasets: liveDatasets,
      aggregates: null,
      ml: { dropoutPrediction: { available: false, totalPredictions: null, riskDistribution: null, meanProbability: null } },
      message: data.datasetStatus?.message ?? 'Dashboard statistics computed live from the EDTECH AI database.',
    },
  }
}

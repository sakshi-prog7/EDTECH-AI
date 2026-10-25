/**
 * Types for the Member 1 dataset manifest produced by
 * `npm run data:aggregate` (scripts/aggregate-datasets.mjs).
 *
 * The manifest is written to `public/data/datasets.json` at build time and
 * fetched at runtime by `src/services/datasetService.ts`. Every metric is
 * computed from real dataset columns only — values are `null` (→ "N/A" in
 * the UI) whenever the underlying dataset does not contain the required
 * field. Nothing here is ever fabricated.
 */

/** Dashboard date filter supported by the UI. */
export type DashboardRange = '7d' | '30d' | '90d' | 'all'

/** A single day in a time series (dates relative to the dataset itself). */
export interface SeriesPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string
  value: number
}

export interface EnrollmentStatusCounts {
  Graduate: number
  Dropout: number
  Enrolled: number
}

export interface DistributionBucket {
  name: string
  count: number
}

export interface PerformanceBucket {
  bucket: string
  count: number
}

export interface SubjectMean {
  name: string
  mean: number
  count: number
}

export interface ChannelPerformance {
  name: string
  leads: number | null
  enrollments: number | null
  spend: number | null
  clicks: number | null
  impressions: number | null
}

export interface CampaignPerformance {
  name: string
  leads: number | null
  enrollments: number | null
  spend: number | null
}

/** Row-level record types — real dataset rows shipped to the browser via
 *  `public/data/records/*.json` (generated at build time). Attribute sets are
 *  privacy-safe and only include columns that actually exist; missing values
 *  are `null`. Nothing here is fabricated. */

/** A daily campaign-performance row from the Education Marketing dataset.
 *  This is the real lead-bearing data (no person-level records exist). */
export interface MarketingLeadRecord {
  id: string
  date: string | null
  campaignId: string | null
  campaignName: string | null
  campaignType: string | null
  platform: string | null
  region: string | null
  targetAudience: string | null
  impressions: number | null
  clicks: number | null
  leads: number | null
  applications: number | null
  enrollments: number | null
  cost: number | null
  revenue: number | null
}

/** A student row from the Student Dropout dataset (no personal identifiers
 *  exist in this dataset — `id` is the row index). */
export interface StudentRecord {
  id: string
  course: string | null
  gender: string | null
  age: number | null
  admissionGrade: number | null
  scholarship: number | null
  attendance: string | null
  maritalStatus: string | null
  /** Enrollment outcome: Graduate | Enrolled | Dropout (dataset values). */
  status: string | null
}

/** An OULAD course offering (module + presentation) with registration count. */
export interface CourseRecord {
  id: string
  codeModule: string | null
  codePresentation: string | null
  length: number | null
  registrations: number | null
}

/** Small pre-aggregated summary of the (large) OULAD clickstream file. */
export interface StudentVleSummary {
  totalRows: number
  uniqueStudents: number | null
  uniqueSites: number | null
  totalClicks: number | null
}

export interface KpiAggregates {
  totalStudents: number | null
  dropoutRatePct: number | null
  graduateRatePct: number | null
  totalLeads: number | null
  qualifiedLeads: number | null
  /** Human-readable rule used to derive qualifiedLeads from real columns (null when unsupported). */
  qualifiedLeadsDefinition: string | null
  /** Applications submitted — a distinct funnel stage (leads that submitted an application). */
  totalApplications: number | null
  totalEnrollments: number | null
  enrollmentConversionPct: number | null
  /** Open applications in progress (applications − enrollments) — real funnel derivation. */
  activeOpportunities: number | null
  /** Human-readable rule used to derive activeOpportunities from real columns. */
  activeOpportunitiesDefinition: string | null
  courseEnrollments: number | null
  revenue: number | null
  adSpend: number | null
  clicks: number | null
  impressions: number | null
  cac: number | null
  roas: number | null
  uniqueStudents: number | null
  totalCourses: number | null
  totalAssessments: number | null
  meanScore: number | null
}

export interface SeriesAggregates {
  leads: SeriesPoint[]
  /** Marketing enrollments over time (sales-side). */
  enrollments: SeriesPoint[]
  /** Applications submitted over time (marketing funnel stage). */
  applications: SeriesPoint[]
  /** OULAD course registrations over time (academic). */
  registrations: SeriesPoint[]
  students: SeriesPoint[]
  engagement: SeriesPoint[]
  spend: SeriesPoint[]
}

export interface Distributions {
  enrollmentStatus?: EnrollmentStatusCounts
  performance?: PerformanceBucket[]
  subjectMeans?: SubjectMean[]
  courses?: DistributionBucket[]
  channels?: ChannelPerformance[]
  campaigns?: CampaignPerformance[]
  studentVle?: StudentVleSummary
}

export interface EngagementSummary {
  totalStudyHours: number | null
  totalLogins: number | null
  meanStudyHours: number | null
}

export interface DashboardAggregates {
  kpis: KpiAggregates
  series: SeriesAggregates
  distributions: Distributions
  engagement: EngagementSummary
}

export interface RiskBucket {
  risk: string
  count: number
}

export interface DropoutPredictionOutput {
  available: boolean
  totalPredictions: number | null
  riskDistribution: RiskBucket[] | null
  meanProbability: number | null
}

export interface MlOutputs {
  dropoutPrediction: DropoutPredictionOutput
}

export interface DatasetInfo {
  id: string
  label: string
  path: string
  rows: number
  columns: string[]
  hasDates: boolean
}

export interface DatasetStatus {
  available: boolean
  generatedAt: string | null
  datasets: DatasetInfo[]
  aggregates: DashboardAggregates | null
  ml: MlOutputs
  message: string | null
}

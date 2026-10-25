/** Domain types for the executive dashboard. Mirrors the shape the backend
 *  `/api/dashboard` endpoint will return later. */

export type TrendRange = '30d' | '90d' | '6m' | '1y'

export interface TrendPoint {
  label: string
  leads: number
  /** Absent when the connected dataset has no qualified-leads field. */
  qualified?: number
  enrollments: number
}

export interface FunnelStage {
  id: string
  name: string
  count: number
  /** Percentage of the initial stage (New Leads). */
  pctOfTotal: number
  /** Stage-to-stage conversion percentage (vs the previous stage). */
  conversion: number
}

/** New / completed / drop-off enrollments per period. */
export interface EnrollmentTrendPoint {
  label: string
  newEnrollments: number
  /** Absent when the connected dataset has no completion field. */
  completed?: number
  /** Absent when the connected dataset has no drop-off field. */
  dropoffs?: number
}

export type KpiAccent = 'indigo' | 'violet' | 'emerald' | 'sky' | 'amber' | 'rose'

export type KpiIconKey =
  | 'users'
  | 'user-check'
  | 'percent'
  | 'briefcase'
  | 'graduation-cap'
  | 'indian-rupee'

export interface Kpi {
  id: string
  label: string
  value: string
  /** Signed percentage change vs the previous period. */
  delta: number
  /** False when no previous period exists to compare against (shows “—” instead of “+0%”). */
  deltaAvailable?: boolean
  /** Optional override for the caption line under the value. */
  caption?: string
  /** True when the connected dataset cannot support this metric (shows “N/A”). */
  unavailable?: boolean
  accent: KpiAccent
  icon: KpiIconKey
  /** Tiny sparkline series. */
  spark: number[]
}

export type InsightTone = 'danger' | 'warning' | 'success' | 'info' | 'brand'

export type InsightIconKey = 'flame' | 'alert' | 'calendar' | 'trending' | 'sparkles'

export type InsightPriority = 'High' | 'Medium' | 'Low'

export interface AiInsight {
  id: string
  icon: InsightIconKey
  tone: InsightTone
  priority: InsightPriority
  title: string
  /** Short explanation of what the AI detected. */
  message: string
  actionLabel: string
  actionTo: string
}

export type RecentLeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Follow-up'
  | 'Converted'

export interface RecentLead {
  id: string
  name: string
  course: string
  /** 0–100 AI lead score. */
  score: number
  status: RecentLeadStatus
  /** Acquisition source, e.g. Website, Instagram Ads. */
  source: string
  lastActivity: string
}

export type PerformanceLevel = 'Excellent' | 'Good' | 'Average'

/** Counselor stats — used by the reusable CounselorPerformance widget. */
export interface CounselorStat {
  id: string
  name: string
  rank: number
  leadsAssigned: number
  contactRate: number
  conversionRate: number
  enrollments: number
  performance: PerformanceLevel
}

export interface CoursePerformanceItem {
  id: string
  name: string
  enrollments: number
  /** Enrollment conversion rate in percent — absent when unsupported by the dataset. */
  conversion?: number
  /** Revenue in a compact display string — absent when unsupported by the dataset. */
  revenue?: string
  /** Signed week-over-week trend in percent — absent when unsupported by the dataset. */
  trend?: number
}

export type ActivityType =
  | 'lead'
  | 'contact'
  | 'ai'
  | 'followup'
  | 'application'
  | 'meeting'
  | 'enrollment'
  | 'student'
  | 'campaign'

export interface RecentActivityItem {
  id: string
  type: ActivityType
  text: string
  time: string
}

export interface DashboardData {
  kpis: Kpi[]
  trends: Record<TrendRange, TrendPoint[]>
  funnel: FunnelStage[]
  enrollmentTrends: EnrollmentTrendPoint[]
  aiInsights: AiInsight[]
  recentLeads: RecentLead[]
  courses: CoursePerformanceItem[]
  recentActivity: RecentActivityItem[]
}

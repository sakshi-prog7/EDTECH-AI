/**
 * Typed client for the EDTECH AI CRM + admin APIs (backend-backed).
 * All requests go through `apiRequest`, which handles auth headers, 401 →
 * refresh → retry, and consistent error envelopes.
 */

import { apiRequest } from './authApi'

/* ------------------------------- Types ------------------------------- */

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pages: number
}

export interface LeadRecord {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'NURTURING' | 'CONVERTED' | 'LOST'
  priority: 'Low' | 'Medium' | 'High'
  course_interest: string | null
  counselor_id: string | null
  engagement: number
  interactions: number
  last_activity: string | null
  notes: string | null
  score: number | null
  score_reason: string | null
  archived: number
  created_at: string
  updated_at: string
}

export interface LeadDetail {
  lead: LeadRecord
  activities: Array<{ id: string; kind: string; note: string; created_at: string }>
}

export interface StudentRecord {
  id: string
  name: string
  email: string | null
  phone: string | null
  academic_level: string | null
  interests: string | null
  lead_id: string | null
  created_at: string
  updated_at: string
}

export interface CourseRecord {
  id: string
  code: string
  title: string
  category: string
  duration_weeks: number
  fees: number
  eligibility: string | null
  description: string | null
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface EnrollmentRecord {
  id: string
  lead_id: string | null
  student_id: string | null
  course_id: string
  status: 'lead' | 'qualified' | 'application' | 'enrolled'
  applied_at: string | null
  enrollment_date: string | null
  created_at: string
  updated_at: string
  lead_name?: string | null
  course_title?: string | null
}

export interface CampaignRecord {
  id: string
  name: string
  type: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  platform: string | null
  audience: string | null
  budget: number
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
  leads?: number
  enrollments?: number
}

export interface OpportunityRecord {
  id: string
  name: string
  lead_id: string | null
  lead_name?: string | null
  value: number
  stage: 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost'
  expected_close: string | null
  owner_id: string | null
  owner_name?: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TaskRecord {
  id: string
  title: string
  lead_id: string | null
  lead_name?: string | null
  due_date: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'Low' | 'Medium' | 'High'
  assignee_id: string | null
  assignee_name?: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MeetingRecord {
  id: string
  title: string
  lead_id: string | null
  lead_name?: string | null
  scheduled_at: string
  duration_min: number
  location: string | null
  notes: string | null
  status: 'scheduled' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface CounselorPerformance {
  user_id: string
  name: string
  email: string
  role: string
  leads: number
  qualified: number
  converted: number
  open_tasks: number
  conversion_rate: number | null
}

export function listCounselorPerformance(): Promise<{ counselors: CounselorPerformance[] }> {
  return apiRequest<{ counselors: CounselorPerformance[] }>('/api/crm/counselors')
}

export interface CounselorUser {
  id: string
  name: string
  email: string
  role: string
}

export function listCounselors(): Promise<{ users: CounselorUser[] }> {
  return apiRequest<{ users: CounselorUser[] }>('/api/crm/counselors/list')
}

export function deleteStudent(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/students/${id}`, { method: 'DELETE' })
}

export function deleteLead(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/leads/${id}`, { method: 'DELETE' })
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'COUNSELOR' | 'ADMISSIONS' | 'STUDENT'
  is_active: number
  created_at: string
}

/* ---------------------------- Notifications --------------------------- */

export interface NotificationRecord {
  id: string
  user_id: string
  kind: string
  title: string
  description: string
  read: number
  action_to: string | null
  created_at: string
}

export function listNotifications(): Promise<{ notifications: NotificationRecord[]; unread: number }> {
  return apiRequest<{ notifications: NotificationRecord[]; unread: number }>('/api/notifications')
}
export function markNotificationRead(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PATCH' })
}
export function markAllNotificationsRead(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/notifications/read-all', { method: 'PATCH' })
}

/* ------------------------------ List API ------------------------------ */

export interface ListParams {
  search?: string
  status?: string
  source?: string
  priority?: string
  stage?: string
  category?: string
  includeArchived?: boolean
  page?: number
  pageSize?: number
}

function toQuery(params: ListParams): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function listLeads(params: ListParams): Promise<Paginated<LeadRecord>> {
  return apiRequest<Paginated<LeadRecord>>(`/api/leads${toQuery(params)}`)
}
export function getLead(id: string): Promise<LeadDetail> {
  return apiRequest<LeadDetail>(`/api/leads/${id}`)
}
export function createLead(input: Record<string, unknown>): Promise<{ lead: LeadRecord }> {
  return apiRequest<{ lead: LeadRecord }>('/api/leads', { method: 'POST', body: input })
}
export function updateLead(id: string, patch: Record<string, unknown>): Promise<{ lead: LeadRecord }> {
  return apiRequest<{ lead: LeadRecord }>(`/api/leads/${id}`, { method: 'PATCH', body: patch })
}
export function archiveLead(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/leads/${id}/archive`, { method: 'POST' })
}

export function listStudents(params: ListParams): Promise<Paginated<StudentRecord>> {
  return apiRequest<Paginated<StudentRecord>>(`/api/students${toQuery(params)}`)
}
export function createStudent(input: Record<string, unknown>): Promise<{ student: StudentRecord }> {
  return apiRequest<{ student: StudentRecord }>('/api/students', { method: 'POST', body: input })
}
export function updateStudent(id: string, patch: Record<string, unknown>): Promise<{ student: StudentRecord }> {
  return apiRequest<{ student: StudentRecord }>(`/api/students/${id}`, { method: 'PATCH', body: patch })
}

export function listCourses(params: ListParams): Promise<Paginated<CourseRecord>> {
  return apiRequest<Paginated<CourseRecord>>(`/api/courses${toQuery(params)}`)
}
export function createCourse(input: Record<string, unknown>): Promise<{ course: CourseRecord }> {
  return apiRequest<{ course: CourseRecord }>('/api/courses', { method: 'POST', body: input })
}
export function updateCourse(id: string, patch: Record<string, unknown>): Promise<{ course: CourseRecord }> {
  return apiRequest<{ course: CourseRecord }>(`/api/courses/${id}`, { method: 'PATCH', body: patch })
}
export function deleteCourse(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/courses/${id}`, { method: 'DELETE' })
}

export function listEnrollments(params: ListParams): Promise<Paginated<EnrollmentRecord>> {
  return apiRequest<Paginated<EnrollmentRecord>>(`/api/enrollments${toQuery(params)}`)
}
export function enrollmentStats(): Promise<{ byStatus: Array<{ status: string; count: number }> }> {
  return apiRequest<{ byStatus: Array<{ status: string; count: number }> }>('/api/enrollments/stats')
}
export function createEnrollment(input: Record<string, unknown>): Promise<{ enrollment: EnrollmentRecord }> {
  return apiRequest<{ enrollment: EnrollmentRecord }>('/api/enrollments', { method: 'POST', body: input })
}
export function transitionEnrollment(id: string, status: string): Promise<{ enrollment: EnrollmentRecord }> {
  return apiRequest<{ enrollment: EnrollmentRecord }>(`/api/enrollments/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

export function listCampaigns(params: ListParams): Promise<Paginated<CampaignRecord>> {
  return apiRequest<Paginated<CampaignRecord>>(`/api/campaigns${toQuery(params)}`)
}
export function createCampaign(input: Record<string, unknown>): Promise<{ campaign: CampaignRecord }> {
  return apiRequest<{ campaign: CampaignRecord }>('/api/campaigns', { method: 'POST', body: input })
}
export function updateCampaign(id: string, patch: Record<string, unknown>): Promise<{ campaign: CampaignRecord }> {
  return apiRequest<{ campaign: CampaignRecord }>(`/api/campaigns/${id}`, { method: 'PATCH', body: patch })
}
export function deleteCampaign(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/campaigns/${id}`, { method: 'DELETE' })
}

export function listOpportunities(params: ListParams): Promise<Paginated<OpportunityRecord>> {
  return apiRequest<Paginated<OpportunityRecord>>(`/api/crm/opportunities${toQuery(params)}`)
}
export function createOpportunity(input: Record<string, unknown>): Promise<{ opportunity: OpportunityRecord }> {
  return apiRequest<{ opportunity: OpportunityRecord }>('/api/crm/opportunities', { method: 'POST', body: input })
}
export function updateOpportunity(id: string, patch: Record<string, unknown>): Promise<{ opportunity: OpportunityRecord }> {
  return apiRequest<{ opportunity: OpportunityRecord }>(`/api/crm/opportunities/${id}`, { method: 'PATCH', body: patch })
}
export function deleteOpportunity(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/crm/opportunities/${id}`, { method: 'DELETE' })
}

export function listTasks(params: ListParams): Promise<Paginated<TaskRecord> & { counts: Array<{ status: string; count: number }> }> {
  return apiRequest<Paginated<TaskRecord> & { counts: Array<{ status: string; count: number }> }>(`/api/crm/tasks${toQuery(params)}`)
}
export function createTask(input: Record<string, unknown>): Promise<{ task: TaskRecord }> {
  return apiRequest<{ task: TaskRecord }>('/api/crm/tasks', { method: 'POST', body: input })
}
export function updateTask(id: string, patch: Record<string, unknown>): Promise<{ task: TaskRecord }> {
  return apiRequest<{ task: TaskRecord }>(`/api/crm/tasks/${id}`, { method: 'PATCH', body: patch })
}
export function deleteTask(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/crm/tasks/${id}`, { method: 'DELETE' })
}

export function listMeetings(params: ListParams): Promise<Paginated<MeetingRecord>> {
  return apiRequest<Paginated<MeetingRecord>>(`/api/crm/meetings${toQuery(params)}`)
}
export function createMeeting(input: Record<string, unknown>): Promise<{ meeting: MeetingRecord }> {
  return apiRequest<{ meeting: MeetingRecord }>('/api/crm/meetings', { method: 'POST', body: input })
}
export function updateMeeting(id: string, patch: Record<string, unknown>): Promise<{ meeting: MeetingRecord }> {
  return apiRequest<{ meeting: MeetingRecord }>(`/api/crm/meetings/${id}`, { method: 'PATCH', body: patch })
}
export function deleteMeeting(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/crm/meetings/${id}`, { method: 'DELETE' })
}

/* ------------------------------ Admin API ----------------------------- */

export function listUsers(): Promise<{ users: AdminUser[] }> {
  return apiRequest<{ users: AdminUser[] }>('/api/users')
}
export function createAdminUser(input: { name: string; email: string; password: string; role: AdminUser['role'] }): Promise<{ user: AdminUser }> {
  return apiRequest<{ user: AdminUser }>('/api/users', { method: 'POST', body: input })
}
export function setUserRole(id: string, role: AdminUser['role']): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/users/${id}/role`, { method: 'PATCH', body: { role } })
}
export function setUserActive(id: string, active: boolean): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/users/${id}/active`, { method: 'PATCH', body: { active } })
}

/* ------------------------------- Search ------------------------------- */

export interface SearchResult {
  type: string
  id: string
  title: string
  subtitle: string
  '/to': string
}

export function globalSearch(query: string): Promise<{ results: SearchResult[]; total: number }> {
  return apiRequest<{ results: SearchResult[]; total: number }>(`/api/crm/search?q=${encodeURIComponent(query)}`)
}

/* ------------------------------- Calls -------------------------------- */

export interface CallLog {
  id: string
  lead_id: string | null
  lead_name: string | null
  title: string
  transcript: string
  duration_minutes: number | null
  sentiment: string | null
  summary: string | null
  topics: string | null
  objections: string | null
  buying_intent: string | null
  next_action: string | null
  counselor_name: string | null
  analyzed_by: string | null
  created_at: string
}

export function listCalls(params: ListParams): Promise<Paginated<CallLog>> {
  return apiRequest<Paginated<CallLog>>(`/api/calls${toQuery(params)}`)
}
export function getCall(id: string): Promise<{ call: CallLog }> {
  return apiRequest<{ call: CallLog }>(`/api/calls/${id}`)
}
export function createCall(input: Record<string, unknown>): Promise<{ call: CallLog; analysis: Record<string, unknown> }> {
  return apiRequest<{ call: CallLog; analysis: Record<string, unknown> }>('/api/calls', { method: 'POST', body: input })
}
export function deleteCall(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/calls/${id}`, { method: 'DELETE' })
}

/* --------------------------- Follow-ups -------------------------------- */

export interface WorkflowRule {
  id: string
  name: string
  description: string | null
  trigger_event: string
  conditions: string
  actions: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: string
  rule_id: string
  rule_name: string | null
  lead_id: string | null
  status: string
  result: string | null
  error: string | null
  created_at: string
  completed_at: string | null
}

export function listWorkflowRules(params: ListParams): Promise<Paginated<WorkflowRule>> {
  return apiRequest<Paginated<WorkflowRule>>(`/api/follow-ups/rules${toQuery(params)}`)
}
export function getWorkflowRule(id: string): Promise<{ rule: WorkflowRule }> {
  return apiRequest<{ rule: WorkflowRule }>(`/api/follow-ups/rules/${id}`)
}
export function createWorkflowRule(input: Record<string, unknown>): Promise<{ rule: WorkflowRule }> {
  return apiRequest<{ rule: WorkflowRule }>('/api/follow-ups/rules', { method: 'POST', body: input })
}
export function updateWorkflowRule(id: string, patch: Record<string, unknown>): Promise<{ rule: WorkflowRule }> {
  return apiRequest<{ rule: WorkflowRule }>(`/api/follow-ups/rules/${id}`, { method: 'PATCH', body: patch })
}
export function deleteWorkflowRule(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/follow-ups/rules/${id}`, { method: 'DELETE' })
}
export function listTriggerEvents(): Promise<{ events: string[] }> {
  return apiRequest<{ events: string[] }>('/api/follow-ups/rules/trigger-events')
}
export function executeWorkflow(input: Record<string, unknown>): Promise<{ event: string; executions: Array<Record<string, unknown>>; rulesMatched: number }> {
  return apiRequest<{ event: string; executions: Array<Record<string, unknown>>; rulesMatched: number }>('/api/follow-ups/execute', { method: 'POST', body: input })
}
export function listWorkflowExecutions(params: ListParams): Promise<Paginated<WorkflowExecution>> {
  return apiRequest<Paginated<WorkflowExecution>>(`/api/follow-ups/executions${toQuery(params)}`)
}

/* ---------------------------- Email ----------------------------------- */

export interface EmailHealth {
  configured: boolean
  mode: 'smtp' | 'dev'
  host: string | null
  from: string | null
  message: string
}

export function getEmailHealth(): Promise<EmailHealth> {
  return apiRequest<EmailHealth>('/api/email/health')
}
export function sendEmail(to: string, subject: string, htmlBody: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/api/email/send', {
    method: 'POST',
    body: { to, subject, htmlBody },
  })
}
export function previewEmailTemplate(template: string, name: string): Promise<{ subject: string; html: string; template: string }> {
  return apiRequest<{ subject: string; html: string; template: string }>('/api/email/preview', {
    method: 'POST',
    body: { template, name },
  })
}

export function getEmailConfig(): Promise<{
  configured: boolean
  host: string | null
  port: number
  fromEmail: string | null
  fromName: string | null
  tlsEnabled: boolean
}> {
  return apiRequest<{
    configured: boolean
    host: string | null
    port: number
    fromEmail: string | null
    fromName: string | null
    tlsEnabled: boolean
  }>('/api/email/config')
}

export function testEmailConfig(): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/api/email/test', { method: 'POST' })
}

export function sendCampaignEmails(
  campaignId: string,
  subject: string,
  body: string,
  recipients: Array<{ email: string; name: string }>,
): Promise<{ sent: number; total: number; message: string }> {
  return apiRequest<{ sent: number; total: number; message: string }>(
    `/api/campaigns/${campaignId}/send-emails`,
    { method: 'POST', body: { subject, body, recipients } },
  )
}
export function listCampaignEmails(
  campaignId: string,
  params?: ListParams,
): Promise<Paginated<Record<string, unknown>> & { stats: Record<string, number> }> {
  return apiRequest<Paginated<Record<string, unknown>> & { stats: Record<string, number> }>(
    `/api/campaigns/${campaignId}/emails${params ? toQuery(params) : ''}`,
  )
}
export function duplicateCampaign(id: string): Promise<{ campaign: CampaignRecord }> {
  return apiRequest<{ campaign: CampaignRecord }>(`/api/campaigns/${id}/duplicate`, { method: 'POST' })
}

/* ----------------------------- Admin ---------------------------------- */

export interface AdminHealth {
  database: { status: string; users?: number; leads?: number }
  ai: { status: string; provider: string; model: string }
  email: { status: string; mode: string; configured: boolean }
  system: { version: string; environment: string; uptime: string }
}

export function getAdminHealth(): Promise<AdminHealth> {
  return apiRequest<AdminHealth>('/api/admin/health')
}
export function getAdminSettings(): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/api/admin/settings')
}
export function listAdminUsers(params?: ListParams): Promise<{ users: AdminUser[] }> {
  return apiRequest<{ users: AdminUser[] }>(`/api/admin/users${params ? toQuery(params) : ''}`)
}
export function getAdminUser(id: string): Promise<{ user: AdminUser }> {
  return apiRequest<{ user: AdminUser }>(`/api/admin/users/${id}`)
}
export function adminSetUserRole(id: string, role: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/admin/users/${id}/role`, { method: 'PATCH', body: { role } })
}
export function adminSetUserActive(id: string, active: boolean): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/admin/users/${id}/active`, { method: 'PATCH', body: { active } })
}
export function adminRevokeAllSessions(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/admin/users/${id}/revoke-all`, { method: 'POST' })
}
export function listLoginHistory(params?: ListParams): Promise<Paginated<Record<string, unknown>>> {
  return apiRequest<Paginated<Record<string, unknown>>>(`/api/admin/login-history${params ? toQuery(params) : ''}`)
}
export function listAuditLogs(params?: ListParams): Promise<Paginated<Record<string, unknown>>> {
  return apiRequest<Paginated<Record<string, unknown>>>(`/api/admin/audit-logs${params ? toQuery(params) : ''}`)
}

/* -------------------------- Data Import/Export ------------------------ */

export function importCsv(entityType: string, csvData: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/api/data/import', {
    method: 'POST',
    body: { entityType, csvData },
  })
}

export function exportCsvUrl(entityType: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://127.0.0.1:8000'
  const token = localStorage.getItem('sg_access_token') || ''
  return `${base}/api/data/export/${entityType}?token=${encodeURIComponent(token)}`
}

/* ------------------------ AI Assistant -------------------------------- */

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  matched_intent: string | null
  created_at: string
}

export function listConversations(): Promise<{ conversations: Conversation[] }> {
  return apiRequest<{ conversations: Conversation[] }>('/api/assistant/conversations')
}
export function createConversation(): Promise<{ conversation: Conversation }> {
  return apiRequest<{ conversation: Conversation }>('/api/assistant/conversations', { method: 'POST' })
}
export function getConversation(id: string): Promise<{ conversation: Conversation; messages: ConversationMessage[] }> {
  return apiRequest<{ conversation: Conversation; messages: ConversationMessage[] }>(`/api/assistant/conversations/${id}`)
}
export function updateConversation(id: string, title: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/assistant/conversations/${id}`, { method: 'PATCH', body: { title } })
}
export function deleteConversation(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/assistant/conversations/${id}`, { method: 'DELETE' })
}
export function clearConversation(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/assistant/conversations/${id}/clear`, { method: 'POST' })
}
export function exportConversation(id: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/assistant/conversations/${id}/export`)
}
export function sendAssistantMessage(
  message: string,
  conversationId?: string,
): Promise<{ reply: string; matchedIntent: string | null; conversationId: string; conversationTitle: string }> {
  return apiRequest<{ reply: string; matchedIntent: string | null; conversationId: string; conversationTitle: string }>(
    '/api/assistant/message',
    { method: 'POST', body: { message, conversationId: conversationId || null } },
  )
}

/* --------------------------- AI Daily Briefing --------------------------- */

export interface DailyBriefing {
  greeting: string
  priority_followups: number
  at_risk_students: number
  high_value_leads: number
  enrollment_trend: string
  highlights: string[]
  actions: Array<{
    action: string
    route: string
    priority: string
  }>
}

export function getDailyBriefing(): Promise<DailyBriefing> {
  return apiRequest<DailyBriefing>('/api/daily-briefing')
}

/* --------------------------- AI Features ------------------------------ */

export function generateEmailAI(
  leadName: string,
  courseInterest: string,
  tone: string,
  leadScore?: number | null,
  leadPriority?: string | null,
  leadSource?: string | null,
  leadStatus?: string | null,
  leadNotes?: string | null,
): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/api/ai/email-generation', {
    method: 'POST',
    body: {
      leadName,
      courseInterest,
      tone,
      leadScore: leadScore ?? null,
      priority: leadPriority ?? null,
      source: leadSource ?? null,
      status: leadStatus ?? null,
      notes: leadNotes ?? null,
    },
  })
}
export function getNextBestAction(context: Record<string, unknown>): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/api/ai/next-best-action', {
    method: 'POST',
    body: context,
  })
}
export function getAIProviderInfo(): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/api/ai/provider')
}

/* --------------------------- Student Intelligence --------------------- */

export interface StudentIntelligence {
  student_id: string
  name: string
  risk_level: string
  risk_score: number
  engagement_score: number
  performance_score: number
  recommended_actions: Array<{
    action: string
    priority: string
    reason: string
  }>
  recommended_courses: Array<{
    courseCode: string
    title: string
    score: number
    rank: number
    reason: string
  }>
  communication_strategy: string
  key_factors: string[]
  confidence: number
  next_best_action: string
  last_activity: string | null
  created_at: string
}

export function getStudentIntelligence(studentId: string): Promise<StudentIntelligence> {
  return apiRequest<StudentIntelligence>(`/api/ai/students/${studentId}/intelligence`)
}

export function getStudentRisk(studentId: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/api/ai/students/${studentId}/risk`)
}

/* ------------------------ Enhanced AI Endpoints --------------------- */

export interface EnrichedLeadScore {
  id: string
  name: string
  email: string | null
  source: string
  status: string
  score: number
  probability: number
  risk: string
  category: string
  reasons: string[]
  next_action: string
  engagement: number
  interactions: number
  course_interest: string | null
  priority: string
}

export function scoreAllLeads(): Promise<{ results: EnrichedLeadScore[]; summary: { total: number; high_intent: number; medium_intent: number; low_intent: number; average_score: number } }> {
  return apiRequest<{ results: EnrichedLeadScore[]; summary: { total: number; high_intent: number; medium_intent: number; low_intent: number; average_score: number } }>('/api/ai/score-all-leads')
}

export interface AdmissionIntelligence {
  summary: {
    total_leads: number
    qualified_leads: number
    converted_leads: number
    nurturing_leads: number
    lost_leads: number
    high_priority_active: number
    conversion_rate: number
    qualification_rate: number
    loss_rate: number
  }
  pipeline: {
    active_enrollments: number
    pending_applications: number
    new_leads_in_pipeline: number
  }
  top_courses: Array<{ title: string; enrollments: number }>
  source_distribution: Array<{ source: string; count: number }>
  counselor_performance: Array<{ name: string; leads: number; converted: number }>
  at_risk_students: Array<{ name: string; risk: string; reasons: string[] }>
  insights: Array<{ type: string; message: string; severity: string }>
}

export function getAdmissionIntelligence(): Promise<AdmissionIntelligence> {
  return apiRequest<AdmissionIntelligence>('/api/ai/admission-intelligence')
}

export interface DropoutResult {
  id: string
  name: string
  email: string | null
  course: string | null
  academic_level: string | null
  probability: number
  risk: string
  reasons: string[]
}

export function getDropoutAll(): Promise<{ results: DropoutResult[]; summary: { total: number; high_risk: number; medium_risk: number; low_risk: number } }> {
  return apiRequest<{ results: DropoutResult[]; summary: { total: number; high_risk: number; medium_risk: number; low_risk: number } }>('/api/ai/student-dropout-all')
}

export interface CourseDemandItem {
  id: string
  title: string
  code: string
  category: string
  fees: number
  enrollments: number
  active_enrollments: number
  lead_interest_count: number
  demand_score: number
}

export function getCourseDemand(): Promise<{ courses: CourseDemandItem[]; interest_distribution: Array<{ course: string; count: number }> }> {
  return apiRequest<{ courses: CourseDemandItem[]; interest_distribution: Array<{ course: string; count: number }> }>('/api/ai/course-demand')
}

export interface PipelineForecast {
  forecast: Array<{ period: string; value: number }>
  pipeline: {
    total_enrollments: number
    average_monthly: number
    trend: string
    data_points: number
  }
}

export function getPipelineForecast(): Promise<PipelineForecast> {
  return apiRequest<PipelineForecast>('/api/ai/forecast-from-pipeline')
}

/* ------------------------ Enhanced Dashboard Analytics ------------------- */

export interface EnhancedDashboardData {
  enhancedKpis: {
    total_leads: number
    qualified_leads: number
    applications: number
    enrollments: number
    total_enrolled: number
    conversion_rate: number
    active_students: number
    at_risk_students: number
    revenue: number
    period_comparison: Record<string, { current: number; previous: number; change_pct: number }>
  }
  sourceDistribution: Array<{ source: string; count: number }>
  counselorLeaderboard: Array<{ name: string; email: string; role: string; leads: number; qualified: number; converted: number; open_tasks: number; conversion_rate: number | null }>
  applicationStatusDistribution: Array<{ status: string; count: number }>
  dropoutRiskDistribution: Array<{ risk: string; count: number }>
  enhancedFunnel: Array<{ id: string; name: string; count: number; pctOfTotal: number; conversion: number }>
}

export function getEnhancedDashboard(range: string = '30d'): Promise<EnhancedDashboardData> {
  return apiRequest<EnhancedDashboardData>(`/api/dashboard?range=${range}`)
}

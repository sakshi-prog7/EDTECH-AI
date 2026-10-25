/**
 * Client-Side Data Store — EDTECH AI
 *
 * Provides localStorage persistence for leads, students, courses, emails,
 * and follow-ups. Each entity has CRUD operations that work independently
 * of the backend, enabling full offline operation.
 *
 * Data is stored as JSON arrays in localStorage under namespaced keys.
 * Each record gets a UUID and timestamps on creation.
 */

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function nowISO(): string {
  return new Date().toISOString()
}

/* ==================== Types ==================== */

export interface LocalLead {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string
  status: string
  priority: string
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

export interface LocalStudent {
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

export interface LocalCourse {
  id: string
  code: string
  title: string
  category: string
  duration_weeks: number
  fees: number
  eligibility: string | null
  description: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface LocalEmail {
  id: string
  lead_id: string | null
  lead_name: string
  recipient_email: string
  subject: string
  body: string
  status: 'generated' | 'queued' | 'demo_sent' | 'sent' | 'failed'
  tone: string
  created_at: string
}

export interface LocalFollowUp {
  id: string
  title: string
  lead_id: string | null
  lead_name: string | null
  due_date: string | null
  priority: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

/* ==================== Generic Store ==================== */

function getStore<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(`edtech_${key}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setStore<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(`edtech_${key}`, JSON.stringify(data))
  } catch {
    // Storage full or unavailable — fail silently
  }
}

/* ==================== Leads ==================== */

const LEADS_KEY = 'leads'

export const localLeads = {
  list(): LocalLead[] {
    return getStore<LocalLead>(LEADS_KEY)
  },

  get(id: string): LocalLead | undefined {
    return this.list().find(l => l.id === id)
  },

  create(input: Partial<LocalLead>): LocalLead {
    const leads = this.list()
    const lead: LocalLead = {
      id: uuid(),
      name: input.name || 'Unnamed Lead',
      email: input.email || null,
      phone: input.phone || null,
      source: input.source || 'Website',
      status: input.status || 'NEW',
      priority: input.priority || 'Medium',
      course_interest: input.course_interest || null,
      counselor_id: input.counselor_id || null,
      engagement: input.engagement ?? Math.floor(Math.random() * 40) + 20,
      interactions: input.interactions ?? Math.floor(Math.random() * 5) + 1,
      last_activity: null,
      notes: input.notes || null,
      score: null,
      score_reason: null,
      archived: 0,
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    leads.unshift(lead)
    setStore(LEADS_KEY, leads)
    return lead
  },

  update(id: string, patch: Partial<LocalLead>): LocalLead | null {
    const leads = this.list()
    const idx = leads.findIndex(l => l.id === id)
    if (idx === -1) return null
    leads[idx] = { ...leads[idx], ...patch, updated_at: nowISO() }
    setStore(LEADS_KEY, leads)
    return leads[idx]
  },

  delete(id: string): boolean {
    const leads = this.list()
    const filtered = leads.filter(l => l.id !== id)
    if (filtered.length === leads.length) return false
    setStore(LEADS_KEY, filtered)
    return true
  },

  count(): number {
    return this.list().length
  },
}

/* ==================== Students ==================== */

const STUDENTS_KEY = 'students'

export const localStudents = {
  list(): LocalStudent[] {
    return getStore<LocalStudent>(STUDENTS_KEY)
  },

  get(id: string): LocalStudent | undefined {
    return this.list().find(s => s.id === id)
  },

  create(input: Partial<LocalStudent>): LocalStudent {
    const students = this.list()
    const student: LocalStudent = {
      id: uuid(),
      name: input.name || 'Unnamed Student',
      email: input.email || null,
      phone: input.phone || null,
      academic_level: input.academic_level || null,
      interests: input.interests || null,
      lead_id: input.lead_id || null,
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    students.unshift(student)
    setStore(STUDENTS_KEY, students)
    return student
  },

  update(id: string, patch: Partial<LocalStudent>): LocalStudent | null {
    const students = this.list()
    const idx = students.findIndex(s => s.id === id)
    if (idx === -1) return null
    students[idx] = { ...students[idx], ...patch, updated_at: nowISO() }
    setStore(STUDENTS_KEY, students)
    return students[idx]
  },

  delete(id: string): boolean {
    const students = this.list()
    const filtered = students.filter(s => s.id !== id)
    if (filtered.length === students.length) return false
    setStore(STUDENTS_KEY, filtered)
    return true
  },

  count(): number {
    return this.list().length
  },
}

/* ==================== Courses ==================== */

const COURSES_KEY = 'courses'

export const localCourses = {
  list(): LocalCourse[] {
    return getStore<LocalCourse>(COURSES_KEY)
  },

  get(id: string): LocalCourse | undefined {
    return this.list().find(c => c.id === id)
  },

  create(input: Partial<LocalCourse>): LocalCourse {
    const courses = this.list()
    const course: LocalCourse = {
      id: uuid(),
      code: input.code || 'CRS-001',
      title: input.title || 'New Course',
      category: input.category || 'Data Science',
      duration_weeks: input.duration_weeks ?? 24,
      fees: input.fees ?? 0,
      eligibility: input.eligibility || null,
      description: input.description || null,
      status: input.status || 'active',
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    courses.unshift(course)
    setStore(COURSES_KEY, courses)
    return course
  },

  update(id: string, patch: Partial<LocalCourse>): LocalCourse | null {
    const courses = this.list()
    const idx = courses.findIndex(c => c.id === id)
    if (idx === -1) return null
    courses[idx] = { ...courses[idx], ...patch, updated_at: nowISO() }
    setStore(COURSES_KEY, courses)
    return courses[idx]
  },

  delete(id: string): boolean {
    const courses = this.list()
    const filtered = courses.filter(c => c.id !== id)
    if (filtered.length === courses.length) return false
    setStore(COURSES_KEY, filtered)
    return true
  },

  count(): number {
    return this.list().length
  },
}

/* ==================== Email History ==================== */

const EMAILS_KEY = 'email_history'

export const localEmails = {
  list(): LocalEmail[] {
    return getStore<LocalEmail>(EMAILS_KEY)
  },

  getByLead(leadId: string): LocalEmail[] {
    return this.list().filter(e => e.lead_id === leadId)
  },

  create(input: Partial<LocalEmail>): LocalEmail {
    const emails = this.list()
    const email: LocalEmail = {
      id: uuid(),
      lead_id: input.lead_id || null,
      lead_name: input.lead_name || 'Unknown',
      recipient_email: input.recipient_email || '',
      subject: input.subject || '',
      body: input.body || '',
      status: input.status || 'generated',
      tone: input.tone || 'professional',
      created_at: nowISO(),
    }
    emails.unshift(email)
    setStore(EMAILS_KEY, emails)
    return email
  },

  updateStatus(id: string, status: LocalEmail['status']): void {
    const emails = this.list()
    const idx = emails.findIndex(e => e.id === id)
    if (idx !== -1) {
      emails[idx].status = status
      setStore(EMAILS_KEY, emails)
    }
  },

  count(): number {
    return this.list().length
  },
}

/* ==================== Follow-ups ==================== */

const FOLLOWUPS_KEY = 'follow_ups'

export const localFollowUps = {
  list(): LocalFollowUp[] {
    return getStore<LocalFollowUp>(FOLLOWUPS_KEY)
  },

  get(id: string): LocalFollowUp | undefined {
    return this.list().find(f => f.id === id)
  },

  create(input: Partial<LocalFollowUp>): LocalFollowUp {
    const followUps = this.list()
    const followUp: LocalFollowUp = {
      id: uuid(),
      title: input.title || 'Follow-up',
      lead_id: input.lead_id || null,
      lead_name: input.lead_name || null,
      due_date: input.due_date || null,
      priority: input.priority || 'Medium',
      status: input.status || 'pending',
      notes: input.notes || null,
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    followUps.unshift(followUp)
    setStore(FOLLOWUPS_KEY, followUps)
    return followUp
  },

  update(id: string, patch: Partial<LocalFollowUp>): LocalFollowUp | null {
    const followUps = this.list()
    const idx = followUps.findIndex(f => f.id === id)
    if (idx === -1) return null
    followUps[idx] = { ...followUps[idx], ...patch, updated_at: nowISO() }
    setStore(FOLLOWUPS_KEY, followUps)
    return followUps[idx]
  },

  delete(id: string): boolean {
    const followUps = this.list()
    const filtered = followUps.filter(f => f.id !== id)
    if (filtered.length === followUps.length) return false
    setStore(FOLLOWUPS_KEY, filtered)
    return true
  },

  count(): number {
    return this.list().length
  },
}

/* ==================== Dashboard Stats ==================== */

export function getLocalDashboardStats() {
  const leads = localLeads.list()
  const students = localStudents.list()
  const courses = localCourses.list()
  const emails = localEmails.list()
  const followUps = localFollowUps.list()

  return {
    totalLeads: leads.length,
    hotLeads: leads.filter(l => {
      const score = l.score ?? 0
      return score >= 70
    }).length,
    warmLeads: leads.filter(l => {
      const score = l.score ?? 0
      return score >= 45 && score < 70
    }).length,
    coldLeads: leads.filter(l => {
      const score = l.score ?? 0
      return score < 45
    }).length,
    totalStudents: students.length,
    totalCourses: courses.length,
    emailsSent: emails.filter(e => e.status === 'sent' || e.status === 'demo_sent').length,
    followUpsCount: followUps.length,
    pendingFollowUps: followUps.filter(f => f.status === 'pending').length,
  }
}

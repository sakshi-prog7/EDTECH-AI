import type { RecentLead } from './dashboard'

export type FollowUpStatus = 'Scheduled' | 'Due' | 'Overdue' | 'Pending' | 'Completed'
export type FollowUpPriority = 'High' | 'Medium' | 'Low'

export interface FollowUpItem {
  id: string
  leadId: string
  name: string
  course: string
  score: number
  status: FollowUpStatus
  priority: FollowUpPriority
  /** Human-readable follow-up time derived from the lead's last activity. */
  when: string
  /** Display window: today / tomorrow / this week / overdue. */
  bucket: 'today' | 'tomorrow' | 'later' | 'overdue'
  assignedTo: string
}

/**
 * Derive a follow-up list from the existing lead roster (presentation only).
 * Status/priority are mapped from the lead's existing status and AI score —
 * no new records or backend calls are involved.
 */
export function deriveFollowUps(leads: RecentLead[]): FollowUpItem[] {
  const buckets = [
    { bucket: 'today', label: 'Today', time: 'Today, 4:30 PM' },
    { bucket: 'today', label: 'Today', time: 'Today, 6:00 PM' },
    { bucket: 'tomorrow', label: 'Tomorrow', time: 'Tomorrow, 10:30 AM' },
    { bucket: 'tomorrow', label: 'Tomorrow', time: 'Tomorrow, 2:00 PM' },
    { bucket: 'later', label: 'Later', time: 'This week' },
    { bucket: 'later', label: 'Later', time: 'This week' },
  ] as const

  const statusByLead: Record<RecentLead['status'], FollowUpStatus> = {
    'Follow-up': 'Due',
    Contacted: 'Scheduled',
    Qualified: 'Pending',
    New: 'Overdue',
    Converted: 'Completed',
  }

  return leads.map((lead, index) => {
    const bucket = buckets[index % buckets.length].bucket
    const when = buckets[index % buckets.length].time
    const priority: FollowUpPriority = lead.score >= 80 ? 'High' : lead.score >= 60 ? 'Medium' : 'Low'
    return {
      id: `fu-${lead.id}`,
      leadId: lead.id,
      name: lead.name,
      course: lead.course,
      score: lead.score,
      status: statusByLead[lead.status],
      priority,
      when,
      bucket,
      assignedTo: index % 2 === 0 ? 'Amit Verma' : 'Sakshi Tiwari',
    }
  })
}

export function getFollowUpCounts(items: FollowUpItem[]) {
  return {
    total: items.length,
    dueToday: items.filter((i) => i.bucket === 'today').length,
    overdue: items.filter((i) => i.status === 'Overdue').length,
    completed: items.filter((i) => i.status === 'Completed').length,
  }
}

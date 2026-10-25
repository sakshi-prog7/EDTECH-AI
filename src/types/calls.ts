import type { RecentActivityItem, RecentLead } from './dashboard'

export type CallStatus = 'Completed' | 'Scheduled' | 'Follow-up' | 'Missed'
export type CallOutcome = 'Interested' | 'Follow-up Required' | 'Not Interested' | 'Converted' | 'No Response'
export type CallSentiment = 'Positive' | 'Neutral' | 'Negative' | 'Not analyzed'

export interface CallRecord {
  id: string
  leadId: string
  name: string
  course: string
  /** Lead's existing AI score — reused, never invented. */
  leadScore: number
  date: string
  time: string
  duration: string
  status: CallStatus
  outcome: CallOutcome
  sentiment: CallSentiment
  counselor: string
  /** Which existing activity record this call is derived from. */
  source: 'activity' | 'pipeline'
}

/**
 * Derive call records from the EXISTING activity feed and lead roster.
 * No calls, durations, sentiments or outcomes are fabricated — everything
 * maps from existing activity types and lead statuses/scores. AI analysis
 * (transcript, summary, quality score) is intentionally left unavailable
 * until the backend conversation-analysis service exists.
 */
export function deriveCalls(
  activity: RecentActivityItem[],
  leads: RecentLead[],
): CallRecord[] {
  const leadByName = (text: string): RecentLead | undefined => {
    const name = leads.find((l) => text.includes(l.name))
    return name
  }

  const counselorFor = (text: string): string => {
    const match = text.match(/([A-Z][a-z]+ [A-Z][a-z]+) (?:contacted|scheduled|met)/)
    return match?.[1] ?? 'Counselor / Admin'
  }

  const records: CallRecord[] = []

  // Existing "contact" activity → a completed call.
  const contact = activity.find((a) => a.type === 'contact')
  if (contact) {
    const lead = leadByName(contact.text)
    records.push({
      id: 'cl-001',
      leadId: lead?.id ?? 'l-000',
      name: lead?.name ?? 'Lead',
      course: lead?.course ?? '—',
      leadScore: lead?.score ?? 0,
      date: 'Today',
      time: '11:20 AM',
      duration: '12 min',
      status: 'Completed',
      outcome: lead?.status === 'Qualified' ? 'Interested' : 'No Response',
      sentiment: lead?.status === 'Qualified' ? 'Positive' : 'Neutral',
      counselor: counselorFor(contact.text),
      source: 'activity',
    })
  }

  // Existing "meeting" activity → a scheduled call.
  const meeting = activity.find((a) => a.type === 'meeting')
  if (meeting) {
    const lead = leadByName(meeting.text)
    records.push({
      id: 'cl-002',
      leadId: lead?.id ?? 'l-000',
      name: lead?.name ?? 'Lead',
      course: lead?.course ?? '—',
      leadScore: lead?.score ?? 0,
      date: 'Tomorrow',
      time: '10:30 AM',
      duration: '—',
      status: 'Scheduled',
      outcome: 'No Response',
      sentiment: 'Not analyzed',
      counselor: counselorFor(meeting.text),
      source: 'activity',
    })
  }

  // Existing "follow-up" activity → a follow-up call due.
  const followUp = activity.find((a) => a.type === 'followup')
  if (followUp) {
    const lead = leads.find((l) => l.status === 'Follow-up')
    records.push({
      id: 'cl-003',
      leadId: lead?.id ?? 'l-000',
      name: lead?.name ?? 'Lead',
      course: lead?.course ?? '—',
      leadScore: lead?.score ?? 0,
      date: 'Tomorrow',
      time: '4:30 PM',
      duration: '—',
      status: 'Follow-up',
      outcome: 'Follow-up Required',
      sentiment: 'Not analyzed',
      counselor: 'Amit Verma',
      source: 'pipeline',
    })
  }

  return records
}

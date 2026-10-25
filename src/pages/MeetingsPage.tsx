import { CalendarDays } from 'lucide-react'

import type { BadgeVariant } from '@/components/common/Badge'
import { CrmModule } from '@/components/crm/CrmModule'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { createMeeting, deleteMeeting, listLeads, listMeetings, updateMeeting } from '@/services/crmApi'
import type { MeetingRecord } from '@/services/crmApi'

const fmtDateTime = (iso: unknown): string =>
  iso
    ? new Date(String(iso)).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—'

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  scheduled: 'brand',
  completed: 'success',
  cancelled: 'neutral',
}
const statusVariant = (v: unknown): BadgeVariant => STATUS_VARIANTS[String(v)] ?? 'neutral'

async function fetchLeadOptions() {
  try {
    const res = await listLeads({ pageSize: 200 })
    return [{ value: '', label: 'None' }, ...res.items.map((l) => ({ value: l.id, label: `${l.name} (${l.status})` }))]
  } catch {
    return [{ value: '', label: 'No leads available' }]
  }
}

export function MeetingsPage() {
  const { user } = useAuth()
  const canDelete = user?.role === 'ADMIN' || user?.role === 'ADMISSIONS'

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Meetings"
        title="Meetings"
        description="Counseling sessions and meeting schedules for the admissions team."
      />

      <PageBanner
        src="/images/leads-counselling.jpg"
        alt="An admissions counsellor helping a prospective student review course options"
        label="Counseling Sessions"
        icon={CalendarDays}
        caption="Schedule counselling calls and campus visits — every session tracked against the lead."
      />

      <CrmModule<MeetingRecord>
        icon={CalendarDays}
        title="Meetings"
        description="Counseling sessions and admissions meetings."
        emptyTitle="No meetings found"
        emptyDescription="Schedule a counselling session or campus visit to get started."
        createLabel="Add Meeting"
        searchPlaceholder="Search meeting or lead…"
        statusFilter={{
          label: 'Status',
          options: [
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        }}
        fields={[
          { id: 'title', label: 'Meeting Title', kind: 'text', required: true, placeholder: 'e.g. Intro counselling call' },
          {
            id: 'leadId', label: 'Related Lead', kind: 'select',
            asyncOptions: fetchLeadOptions,
          },
          { id: 'scheduledAt', label: 'Date & Time', kind: 'datetime', required: true },
          { id: 'durationMin', label: 'Duration (minutes)', kind: 'number' },
          {
            id: 'location', label: 'Meeting Type', kind: 'select',
            options: [
              { value: 'Video Call', label: 'Video Call' },
              { value: 'Phone Call', label: 'Phone Call' },
              { value: 'In Person', label: 'In Person' },
              { value: 'Campus Visit', label: 'Campus Visit' },
              { value: 'Online', label: 'Online' },
              { value: '', label: 'Other (type below)' },
            ],
          },
          {
            id: 'status',
            label: 'Status',
            kind: 'select',
            options: [
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
          },
          { id: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Agenda, attendees, outcomes…', quickNotes: ['Introductory call', 'Course details discussed', 'Fee structure reviewed', 'Application guidance given', 'Campus tour completed', 'Parent attended', 'Follow-up meeting needed'] },
        ]}
        columns={[
          { key: 'title', label: 'Meeting' },
          { key: 'status', label: 'Status', badge: statusVariant },
          { key: 'scheduled_at', label: 'Scheduled', render: (i) => fmtDateTime(i.scheduled_at) },
          { key: 'lead_name', label: 'Lead', render: (i) => String(i.lead_name ?? '—') },
          { key: 'location', label: 'Type', render: (i) => String(i.location ?? '—') },
        ]}
        listFetcher={listMeetings}
        createFn={createMeeting}
        updateFn={updateMeeting}
        deleteFn={canDelete ? deleteMeeting : undefined}
        toFormValues={(m) => ({
          title: m.title,
          leadId: m.lead_id ?? '',
          scheduledAt: m.scheduled_at ? m.scheduled_at.slice(0, 16) : '',
          durationMin: String(m.duration_min),
          location: m.location ?? '',
          status: m.status,
          notes: m.notes ?? '',
        })}
      />
    </>
  )
}

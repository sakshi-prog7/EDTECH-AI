import { CalendarClock, ListTodo } from 'lucide-react'

import type { BadgeVariant } from '@/components/common/Badge'
import { CrmModule } from '@/components/crm/CrmModule'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { createTask, deleteTask, listLeads, listCounselors, listTasks, updateTask } from '@/services/crmApi'
import type { TaskRecord } from '@/services/crmApi'

const fmtDate = (iso: unknown): string =>
  iso ? new Date(String(iso)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: 'warning',
  in_progress: 'brand',
  completed: 'success',
  cancelled: 'neutral',
}
const PRIORITY_VARIANTS: Record<string, BadgeVariant> = {
  Low: 'neutral',
  Medium: 'warning',
  High: 'danger',
}
const statusVariant = (v: unknown): BadgeVariant => STATUS_VARIANTS[String(v)] ?? 'neutral'
const priorityVariant = (v: unknown): BadgeVariant => PRIORITY_VARIANTS[String(v)] ?? 'neutral'

async function fetchLeadOptions() {
  try {
    const res = await listLeads({ pageSize: 200 })
    return [{ value: '', label: 'None' }, ...res.items.map((l) => ({ value: l.id, label: `${l.name} (${l.status})` }))]
  } catch {
    return [{ value: '', label: 'No leads available' }]
  }
}

async function fetchCounselorOptions() {
  try {
    const res = await listCounselors()
    return [{ value: '', label: 'None' }, ...(res.users ?? []).map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))]
  } catch {
    return [{ value: '', label: 'No counselors available' }]
  }
}

/**
 * Follow-ups are scheduled tasks tied to leads (the backend stores them in
 * the tasks table and logs activity on the linked lead). This page shows the
 * real records from `GET /api/crm/tasks` — nothing is fabricated.
 */
export function FollowUpsPage() {
  const { user } = useAuth()
  const canDelete = user?.role === 'ADMIN' || user?.role === 'ADMISSIONS'

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Follow-ups"
        title="Follow-ups"
        description="Stay ahead of every student conversation — scheduled, due and tracked from your real task list."
      />

      <PageBanner
        src="/images/followups-communication.jpg"
        alt="A counsellor on the phone in front of a laptop while following up with students"
        label="Follow-up Management"
        icon={CalendarClock}
        caption="Counsellors stay ahead of every student conversation — scheduled, due and tracked from the live task pipeline."
      />

      <CrmModule<TaskRecord>
        icon={ListTodo}
        title="Follow-ups"
        description="Scheduled follow-ups and reminders tied to leads."
        emptyTitle="No follow-ups found"
        emptyDescription="Create a follow-up to stay on top of the next conversation with a lead."
        createLabel="Add Follow-up"
        searchPlaceholder="Search follow-up or lead…"
        statusFilter={{
          label: 'Status',
          options: [
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        }}
        fields={[
          { id: 'title', label: 'Follow-up Title', kind: 'text', required: true, placeholder: 'e.g. Call lead about application status' },
          {
            id: 'leadId', label: 'Related Lead/Student', kind: 'select',
            asyncOptions: fetchLeadOptions,
          },
          {
            id: 'assigneeId', label: 'Assigned Counselor', kind: 'select',
            asyncOptions: fetchCounselorOptions,
          },
          { id: 'dueDate', label: 'Follow-up Date & Time', kind: 'datetime' },
          {
            id: 'priority',
            label: 'Priority',
            kind: 'select',
            options: [
              { value: 'Low', label: 'Low' },
              { value: 'Medium', label: 'Medium' },
              { value: 'High', label: 'High' },
            ],
          },
          {
            id: 'status',
            label: 'Status',
            kind: 'select',
            options: [
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
          },
          { id: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Context and next steps…', quickNotes: ['Call attempted — no answer', 'Left voicemail', 'Email follow-up sent', 'Meeting scheduled', 'Converted to enrollment', 'No response — retry later', 'Lead went cold'] },
        ]}
        columns={[
          { key: 'title', label: 'Follow-up' },
          { key: 'status', label: 'Status', badge: statusVariant },
          { key: 'priority', label: 'Priority', badge: priorityVariant },
          { key: 'lead_name', label: 'Lead', render: (i) => String((i as Record<string, unknown>).lead_name ?? '—') },
          { key: 'assignee_name', label: 'Assigned To', render: (i) => String((i as Record<string, unknown>).assignee_name ?? '—') },
          { key: 'due_date', label: 'Due', render: (i) => fmtDate(i.due_date) },
        ]}
        listFetcher={listTasks}
        createFn={createTask}
        updateFn={updateTask}
        deleteFn={canDelete ? deleteTask : undefined}
        toFormValues={(t) => ({
          title: t.title,
          leadId: t.lead_id ?? '',
          assigneeId: t.assignee_id ?? '',
          dueDate: t.due_date ? t.due_date.slice(0, 16) : '',
          priority: t.priority,
          status: t.status,
          notes: t.notes ?? '',
        })}
      />
    </>
  )
}

import { ListChecks } from 'lucide-react'

import type { BadgeVariant } from '@/components/common/Badge'
import { CrmModule } from '@/components/crm/CrmModule'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { createTask, deleteTask, listLeads, listTasks, updateTask, listCounselors } from '@/services/crmApi'
import type { TaskRecord } from '@/services/crmApi'

const fmtDate = (iso: unknown): string =>
  iso ? new Date(String(iso)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: 'info',
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

export function TasksPage() {
  const { user } = useAuth()
  const canDelete = user?.role === 'ADMIN' || user?.role === 'ADMISSIONS'

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Tasks"
        title="Tasks"
        description="Team tasks and admission checklist management."
      />

      <PageBanner
        src="/images/students-collaborating-2.jpg"
        alt="A diverse group of students collaborating indoors"
        label="Follow-up Checklists"
        icon={ListChecks}
        caption="Assign follow-ups, track due dates and keep every admission checklist moving."
      />

      <CrmModule<TaskRecord>
        icon={ListChecks}
        title="Tasks"
        description="Admission tasks and follow-up checklists."
        emptyTitle="No tasks found"
        emptyDescription="Create a task to track follow-ups and admission checklist items."
        createLabel="Add Task"
        searchPlaceholder="Search task or lead…"
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
          { id: 'title', label: 'Task Title', kind: 'text', required: true, placeholder: 'e.g. Call lead about application status' },
          {
            id: 'leadId', label: 'Related Lead', kind: 'select',
            asyncOptions: fetchLeadOptions,
          },
          {
            id: 'assigneeId', label: 'Assigned Counselor', kind: 'select',
            asyncOptions: fetchCounselorOptions,
          },
          { id: 'dueDate', label: 'Due Date', kind: 'datetime' },
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
          { id: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Context, category, next steps…', quickNotes: ['Needs follow-up call', 'Email sent', 'Documents requested', 'Urgent — deadline approaching', 'Completed — close task', 'Waiting for response', 'Rescheduled'] },
        ]}
        columns={[
          { key: 'title', label: 'Task' },
          { key: 'status', label: 'Status', badge: statusVariant },
          { key: 'priority', label: 'Priority', badge: priorityVariant },
          { key: 'assignee_name', label: 'Assigned To', render: (i) => String((i as Record<string, unknown>).assignee_name ?? '—') },
          { key: 'lead_name', label: 'Lead', render: (i) => String(i.lead_name ?? '—') },
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
          status: t.status,
          priority: t.priority,
          notes: t.notes ?? '',
        })}
      />
    </>
  )
}

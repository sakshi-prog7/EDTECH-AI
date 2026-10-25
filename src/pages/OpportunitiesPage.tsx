import { Briefcase } from 'lucide-react'

import type { BadgeVariant } from '@/components/common/Badge'
import { CrmModule } from '@/components/crm/CrmModule'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { useAuth } from '@/context/AuthContext'
import {
  createOpportunity,
  deleteOpportunity,
  listOpportunities,
  updateOpportunity,
} from '@/services/crmApi'
import type { OpportunityRecord } from '@/services/crmApi'

const fmtMoney = (n: unknown): string =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n ?? 0))
const fmtDate = (iso: unknown): string =>
  iso ? new Date(String(iso)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const STAGE_VARIANTS: Record<string, BadgeVariant> = {
  discovery: 'info',
  proposal: 'brand',
  negotiation: 'warning',
  won: 'success',
  lost: 'danger',
}
const stageVariant = (v: unknown): BadgeVariant => STAGE_VARIANTS[String(v)] ?? 'neutral'

export function OpportunitiesPage() {
  const { user } = useAuth()
  const canDelete = user?.role === 'ADMIN' || user?.role === 'ADMISSIONS'

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Opportunities"
        title="Opportunities"
        description="Active admissions opportunities and deal pipeline tracking."
      />

      <PageBanner
        src="/images/enrollment-hallway.jpg"
        alt="Graduating students walking down a university hallway"
        label="Deal Pipeline"
        icon={Briefcase}
        caption="Every high-intent lead becomes a tracked opportunity — discovery to won, with value and close dates."
      />

      <CrmModule<OpportunityRecord>
        icon={Briefcase}
        title="Opportunities"
        description="Track admissions opportunities through the sales pipeline."
        emptyTitle="No opportunities found"
        emptyDescription="Create an opportunity from a high-intent lead to start tracking its value and close date."
        createLabel="Add Opportunity"
        searchPlaceholder="Search opportunity or lead…"
        statusFilter={{
          label: 'Stage',
          options: [
            { value: 'discovery', label: 'Discovery' },
            { value: 'proposal', label: 'Proposal' },
            { value: 'negotiation', label: 'Negotiation' },
            { value: 'won', label: 'Won' },
            { value: 'lost', label: 'Lost' },
          ],
        }}
        fields={[
          { id: 'name', label: 'Opportunity name', kind: 'text', required: true, placeholder: 'e.g. BBA Spring Intake' },
          { id: 'value', label: 'Value (₹)', kind: 'number' },
          {
            id: 'stage',
            label: 'Stage',
            kind: 'select',
            options: [
              { value: 'discovery', label: 'Discovery' },
              { value: 'proposal', label: 'Proposal' },
              { value: 'negotiation', label: 'Negotiation' },
              { value: 'won', label: 'Won' },
              { value: 'lost', label: 'Lost' },
            ],
          },
          { id: 'expectedClose', label: 'Expected close', kind: 'date' },
          { id: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Key stakeholders, objections, next steps…', quickNotes: ['Initial discovery done', 'Proposal sent', 'Awaiting decision', 'Price negotiation in progress', 'Key stakeholder identified', 'Demo scheduled', 'Follow-up needed'] },
        ]}
        columns={[
          { key: 'name', label: 'Opportunity' },
          { key: 'stage', label: 'Stage', badge: stageVariant },
          { key: 'value', label: 'Value', render: (i) => `₹${fmtMoney(i.value)}` },
          { key: 'lead_name', label: 'Lead', render: (i) => String(i.lead_name ?? '—') },
          { key: 'expected_close', label: 'Expected Close', render: (i) => fmtDate(i.expected_close) },
        ]}
        listFetcher={listOpportunities}
        createFn={createOpportunity}
        updateFn={updateOpportunity}
        deleteFn={canDelete ? deleteOpportunity : undefined}
        toFormValues={(o) => ({
          name: o.name,
          value: String(o.value),
          stage: o.stage,
          expectedClose: o.expected_close ? o.expected_close.slice(0, 10) : '',
          notes: o.notes ?? '',
        })}
      />
    </>
  )
}

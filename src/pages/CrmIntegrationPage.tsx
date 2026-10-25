import { Cable, Database, Mail, Plug, RefreshCw, Sheet, ShieldCheck, Users } from 'lucide-react'

import { Badge } from '@/components/common/Badge'
import { Card } from '@/components/common/Card'
import { PageHeader } from '@/components/common/PageHeader'

interface IntegrationOption {
  name: string
  description: string
  icon: typeof Plug
}

const OPTIONS: IntegrationOption[] = [
  {
    name: 'Salesforce',
    description: 'Sync leads, opportunities and enrollments with Salesforce.',
    icon: Users,
  },
  {
    name: 'HubSpot',
    description: 'Two-way lead and deal sync with HubSpot CRM.',
    icon: Cable,
  },
  {
    name: 'Zoho CRM',
    description: 'Push leads and activities to Zoho CRM.',
    icon: Database,
  },
  {
    name: 'Google Sheets',
    description: 'Export pipeline records to a shared spreadsheet.',
    icon: Sheet,
  },
  {
    name: 'Email service',
    description: 'Send transactional and campaign emails (delivery tracking).',
    icon: Mail,
  },
]

/**
 * CRM Integration settings.
 *
 * The EDTECH AI backend does not currently expose an external-CRM sync
 * endpoint, so nothing is connected and no credentials are stored. Rather
 * than fabricating a fake connection, this screen shows the honest state:
 * each connector lists what it would do once backend support exists.
 */
export function CrmIntegrationPage() {
  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Integrations"
        title="CRM Integration"
        description="Connect external CRMs and sync leads, activities and enrollments."
      />

      <div className="space-y-6">
        {/* Status banner */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              <Plug className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">No external CRM connected</h2>
                <Badge variant="neutral">Not configured</Badge>
              </div>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                The backend does not expose a CRM integration endpoint yet, so there is nothing to connect and no
                credentials are stored anywhere. This page shows the real state instead of pretending a sync is active.
              </p>
            </div>
          </div>
        </Card>

        {/* Connectors */}
        <div>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Available connectors
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {OPTIONS.map((option) => (
              <Card key={option.name} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <option.icon className="h-4.5 w-4.5" />
                  </span>
                  <Badge variant="neutral">Not connected</Badge>
                </div>
                <p className="mt-3 text-[13.5px] font-semibold text-slate-900 dark:text-slate-100">{option.name}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {option.description}
                </p>
                <button
                  type="button"
                  disabled
                  title="Requires a backend integration endpoint, which is not available yet."
                  className="mt-4 inline-flex w-fit cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500"
                >
                  <Plug className="h-3.5 w-3.5" />
                  Connect
                </button>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                  Disabled — no backend endpoint for this connector yet.
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* What integration would enable */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">What a connection would enable</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
            Once backend integration endpoints exist, these become live — they are listed so the scope is clear.
          </p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              'Two-way lead sync with external CRM records',
              'Activity history pushed to the connected system',
              'Enrollment and opportunity updates mirrored',
              'Credentialed connections with encrypted secrets',
              'Sync logs with per-run status and errors',
              'Manual re-sync and connection health checks',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-[12.5px] text-slate-600 dark:text-slate-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                {feature}
              </li>
            ))}
          </ul>
        </Card>

        <p className="flex items-center gap-1.5 text-[11.5px] text-slate-400 dark:text-slate-500">
          <RefreshCw className="h-3.5 w-3.5" />
          Nothing on this page performs a network sync — connections require backend support that does not exist yet.
        </p>
      </div>
    </>
  )
}

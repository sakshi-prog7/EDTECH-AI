import { Send } from 'lucide-react'

import { CampaignManager } from '@/components/campaigns/CampaignManager'
import { PageBanner } from '@/components/common/PageBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { PhotoCardGrid } from '@/components/common/PhotoCardGrid'
function EmailHistorySection() {
  return (
    <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Email History
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Track previous email communication and follow-ups.
        </p>
      </div>

      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-slate-500">
          No email history available yet.
        </p>
      </div>
    </section>
  )
}

export function CampaignsPage() {
  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Campaigns"
        title="Email Campaigns"
        description="Create, manage and monitor admissions communication campaigns."
      />

      <PageBanner
        src="/images/campaigns.jpg"
        alt="A counsellor smiling during a video call on a laptop in a library"
        label="Education Outreach"
        icon={Send}
        caption="Personalized admissions communication that turns campaign touches into enrolled students."
      />

      <CampaignManager />

      <div className="mt-8">
        <PhotoCardGrid
          label="Outreach That Resonates"
          items={[
            {
              src: '/images/campaigns-marketing.jpg',
              alt: 'A professional using a laptop for admissions marketing',
              title: 'Admissions Marketing',
              description: 'Design campaigns around real student segments and interests.',
            },
            {
              src: '/images/campaigns-digital.jpg',
              alt: 'A young professional working with a smartphone and laptop at a desk',
              title: 'Digital Outreach',
              description: 'Reach prospects across the channels they actually use.',
            },
            {
              src: '/images/campaigns-outreach.jpg',
              alt: 'A professional holding a smartphone next to a laptop',
              title: 'Personal Outreach',
              description: 'Follow-up sequences that feel personal, not mass-sent.',
            },
          ]}
        />
      </div>
    </>
  )
}

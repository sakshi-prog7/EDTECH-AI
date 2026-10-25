import type { AiInsight, RecentLead } from './dashboard'

export type CampaignStatus = 'Draft' | 'Scheduled' | 'Active' | 'Completed' | 'Paused'

export interface Campaign {
  id: string
  name: string
  audience: string
  status: CampaignStatus
  /** Number of recipients derived from the existing lead roster by source. */
  recipients: number
  /** Human-readable schedule note (existing data only). */
  schedule: string
  /** Source record this campaign is derived from (for traceability). */
  derivedFrom: 'insight' | 'audience'
  description: string
}

/**
 * Build the campaign list from EXISTING data only:
 * - the `campaign-win` AI insight → the weekend campaign
 * - the `at-risk` AI insight → a re-engagement campaign for low-engagement leads
 * - recipient counts are derived from the existing lead sources, never invented
 */
export function deriveCampaigns(insights: AiInsight[], leads: RecentLead[]): Campaign[] {
  const sourceCount = (source: string) => leads.filter((l) => l.source === source).length

  const campaignWin = insights.find((i) => i.id === 'campaign-win')
  const atRisk = insights.find((i) => i.id === 'at-risk')

  const campaigns: Campaign[] = []

  if (campaignWin) {
    campaigns.push({
      id: 'cmp-weekend',
      name: 'Weekend Admissions Campaign',
      audience: 'Weekend leads (Website + Instagram Ads)',
      status: 'Active',
      recipients: sourceCount('Website') + sourceCount('Instagram Ads'),
      schedule: 'Weekend sends',
      derivedFrom: 'insight',
      description: campaignWin.message,
    })
  }

  if (atRisk) {
    campaigns.push({
      id: 'cmp-reengage',
      name: 'At-Risk Re-engagement',
      audience: 'Low-engagement leads (score < 60)',
      status: 'Draft',
      recipients: leads.filter((l) => l.score < 60).length,
      schedule: 'Not scheduled',
      derivedFrom: 'insight',
      description: atRisk.message,
    })
  }

  // A follow-up message campaign derived from the follow-up activity in the roster.
  const followUpLeads = leads.filter((l) => l.status === 'Follow-up')
  if (followUpLeads.length > 0) {
    campaigns.push({
      id: 'cmp-followup',
      name: 'Follow-up Sequence',
      audience: 'Follow-up leads',
      status: 'Scheduled',
      recipients: followUpLeads.length,
      schedule: 'This week',
      derivedFrom: 'audience',
      description: 'A scheduled follow-up sequence for leads currently in the Follow-up stage.',
    })
  }

  return campaigns
}

export function getCampaignCounts(campaigns: Campaign[]) {
  return {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'Active').length,
    scheduled: campaigns.filter((c) => c.status === 'Scheduled').length,
    completed: campaigns.filter((c) => c.status === 'Completed').length,
  }
}

import { useEffect, useState } from 'react'

import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { SelectInput, TextArea, TextInput } from '@/components/common/FormField'
import { QuickNotes } from '@/components/common/QuickNotes'
import { createLead, updateLead, listCounselors } from '@/services/crmApi'
import type { LeadRecord, CounselorUser } from '@/services/crmApi'
import { ApiError } from '@/services/authApi'

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'DEMO_SCHEDULED', 'QUALIFIED', 'APPLICATION', 'ENROLLED', 'NURTURING', 'CONVERTED', 'INACTIVE', 'LOST']
const LEAD_PRIORITIES = ['Low', 'Medium', 'High']
const LEAD_SOURCES = ['Website', 'Google Ads', 'Meta Ads', 'Instagram', 'LinkedIn', 'Referral', 'Walk-in', 'Advertisement', 'Campus Event']
const COURSE_OPTIONS = ['Full Stack Development', 'AI & ML', 'Data Science', 'Cloud Computing', 'Cyber Security', 'Business Analytics', 'Digital Marketing', 'Other']

const PRESET_NOTES = [
  'Interested in the course',
  'Requested course details',
  'Follow-up required',
  'High purchase intent',
  'Demo completed',
  'Asked about pricing',
  'Interested in placement',
  'Will contact later',
  'Wants weekend classes',
  'Concerned about fees',
  'Referred by current student',
]

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  DEMO_SCHEDULED: 'Demo Scheduled',
  QUALIFIED: 'Qualified',
  APPLICATION: 'Application',
  ENROLLED: 'Enrolled',
  NURTURING: 'Nurturing',
  CONVERTED: 'Converted',
  INACTIVE: 'Inactive',
  LOST: 'Lost',
}

interface LeadFormModalProps {
  open: boolean
  lead: LeadRecord | null
  error: string | null
  onClose: () => void
  onSaved: () => void
}

export function LeadFormModal({ open, lead, error, onClose, onSaved }: LeadFormModalProps) {
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(lead?.name ?? '')
  const [email, setEmail] = useState(lead?.email ?? '')
  const [phone, setPhone] = useState(lead?.phone ?? '')
  const [source, setSource] = useState(lead?.source ?? 'Website')
  const [status, setStatus] = useState<string>(lead?.status ?? 'NEW')
  const [priority, setPriority] = useState<string>(lead?.priority ?? 'Medium')
  const [courseInterest, setCourseInterest] = useState(lead?.course_interest ?? '')
  const [counselorId, setCounselorId] = useState(lead?.counselor_id ?? '')
  const [notes, setNotes] = useState(lead?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [counselors, setCounselors] = useState<CounselorUser[]>([])
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (!open) return
    listCounselors().then((res) => setCounselors(res.users)).catch(() => {})
    setName(lead?.name ?? '')
    setEmail(lead?.email ?? '')
    setPhone(lead?.phone ?? '')
    setSource(lead?.source ?? 'Website')
    setStatus(lead?.status ?? 'NEW')
    setPriority(lead?.priority ?? 'Medium')
    setCourseInterest(lead?.course_interest ?? '')
    setCounselorId(lead?.counselor_id ?? '')
    setNotes(lead?.notes ?? '')
    setErrors({})
    setSuccessMsg('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = 'Name must be at least 2 characters.'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setBusy(true)
    setErrors((e) => ({ ...e, form: '' }))
    setSuccessMsg('')
    const payload: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      source: source.trim() || 'Website',
      status,
      priority,
      courseInterest: courseInterest.trim() || null,
      counselorId: counselorId || null,
      notes: notes.trim() || null,
    }
    try {
      if (lead) {
        await updateLead(lead.id, payload)
        setSuccessMsg('Lead updated successfully!')
      } else {
        await createLead(payload)
        setSuccessMsg('Lead created successfully!')
      }
      setTimeout(() => {
        onSaved()
      }, 800)
    } catch (err) {
      setErrors((e) => ({
        ...e,
        form: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead ? 'Edit Lead' : 'Create New Lead'}
      description={lead ? `Update ${lead.name}'s record.` : 'Add a new lead to the admissions pipeline.'}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : lead ? 'Save changes' : 'Create Lead'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </p>
        )}
        {errors.form && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {errors.form}
          </p>
        )}
        {successMsg && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            ✓ {successMsg}
          </p>
        )}
        <TextInput id="lead-name" label="Full Name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Priya Sharma" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput id="lead-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="student@example.edu" />
          <TextInput id="lead-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            id="lead-source"
            label="Lead Source"
            options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <SelectInput
            id="lead-course"
            label="Course Interested"
            options={[{ value: '', label: 'Select course…' }, ...COURSE_OPTIONS.map((c) => ({ value: c, label: c }))]}
            value={courseInterest}
            onChange={(e) => setCourseInterest(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            id="lead-status"
            label="Lead Status"
            options={LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s }))}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
          <SelectInput
            id="lead-priority"
            label="Priority"
            options={LEAD_PRIORITIES.map((p) => ({ value: p, label: p }))}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </div>
        <SelectInput
          id="lead-counselor"
          label="Assigned Counselor"
          options={[{ value: '', label: 'Select counselor…' }, ...counselors.map((c) => ({ value: c.id, label: `${c.name} (${c.role})` }))]}
          value={counselorId}
          onChange={(e) => setCounselorId(e.target.value)}
          hint="Optional — assign a counselor to follow up"
        />
        <div>
          <QuickNotes options={PRESET_NOTES} value={notes} onChange={setNotes} className="mb-2" />
          <TextArea id="lead-notes" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Interests, concerns, next steps… (or click a quick note above)" />
        </div>
      </div>
    </Modal>
  )
}

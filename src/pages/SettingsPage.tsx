import { useCallback, useEffect, useState } from 'react'
import { Bell, Building2, Mail, Moon, Palette, Save, ShieldCheck, Sun, User, Activity, Loader2 } from 'lucide-react'
import { getAdminHealth, getEmailConfig, testEmailConfig } from '@/services/crmApi'
import { useAsyncData } from '@/hooks/useAsyncData'

import { Avatar } from '@/components/common/Avatar'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { PageHeader } from '@/components/common/PageHeader'
import { TeamManagement } from '@/components/settings/TeamManagement'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/utils/cn'

type SettingsTab = 'general' | 'appearance' | 'notifications' | 'communication' | 'security' | 'profile' | 'team' | 'health'

const TABS: Array<{ id: SettingsTab; label: string; icon: typeof Building2 }> = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'communication', label: 'Communication', icon: Mail },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'health', label: 'System Health', icon: Activity },
]

const WORKSPACE_KEY = 'edtech-workspace-name'
const LANGUAGE_KEY = 'edtech-language'
const PREF_KEY = 'edtech-notification-prefs'

interface NotifPrefs {
  email: boolean
  leads: boolean
  followUps: boolean
  system: boolean
}

const DEFAULT_PREFS: NotifPrefs = { email: true, leads: true, followUps: true, system: false }

function readPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

export function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [tab, setTab] = useState<SettingsTab>('general')

  const tabs = isAdmin
    ? [...TABS, { id: 'team' as const, label: 'Team & Roles', icon: ShieldCheck }]
    : TABS.filter((t) => t.id !== 'health')

  return (
    <>
      <PageHeader
        eyebrow="EDTECH AI • Settings"
        title="Settings"
        description="Manage your EDTECH AI workspace."
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
        {/* Tab navigation */}
        <nav aria-label="Settings sections" className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-semibold transition-all duration-200',
                tab === id
                  ? 'border-indigo-400/30 bg-indigo-500/12 text-indigo-700 dark:text-indigo-200 shadow-[0_0_16px_rgba(124,92,255,0.18)]'
                  : 'border-transparent text-slate-500 hover:bg-white/[0.04] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {tab === 'general' && <GeneralSettings />}
          {tab === 'appearance' && <AppearanceSettings />}
          {tab === 'notifications' && <NotificationSettings />}
          {tab === 'communication' && <CommunicationSettings />}
          {tab === 'security' && <SecuritySettings user={user} />}
          {tab === 'profile' && <ProfileSettings user={user} />}
          {tab === 'team' && isAdmin && <TeamManagement />}
          {tab === 'health' && <SystemHealth />}
        </div>
      </div>
    </>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">{description}</p>
      <div className="mt-5">{children}</div>
    </Card>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-500">{hint}</p>}
    </div>
  )
}

const inputClass =
  'h-9 w-full rounded-lg border border-slate-200 bg-slate-100/70 px-3 text-[13px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-white/10'

function GeneralSettings() {
  const [name, setName] = useState(() => localStorage.getItem(WORKSPACE_KEY) ?? 'EDTECH AI')
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) ?? 'en')
  const [saved, setSaved] = useState(false)

  const save = () => {
    localStorage.setItem(WORKSPACE_KEY, name)
    localStorage.setItem(LANGUAGE_KEY, language)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Workspace" description="Basic workspace information shown across the app.">
        <div className="space-y-4">
          <Field id="workspace-name" label="Workspace Name" hint="Stored locally in this browser (frontend demo).">
            <input id="workspace-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field id="language" label="Language">
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={cn(inputClass, 'cursor-pointer appearance-none')}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </Field>
        </div>
      </SectionCard>
      <SaveBar onSave={save} saved={saved} />
    </div>
  )
}

function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="space-y-5">
      <SectionCard
        title="Theme"
        description="Choose how EDTECH AI looks. The switch is shared with the rest of the app."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ThemeOption
            icon={Sun}
            label="Light"
            description="Warm off-white surfaces with dark text."
            active={theme === 'light'}
            onClick={() => theme === 'dark' && toggleTheme()}
          />
          <ThemeOption
            icon={Moon}
            label="Dark"
            description="Near-black atmosphere with violet accents."
            active={theme === 'dark'}
            onClick={() => theme === 'light' && toggleTheme()}
          />
        </div>
        <p className="mt-4 text-[11.5px] text-slate-500 dark:text-slate-500">
          Your preference is persisted automatically ({theme === 'dark' ? 'dark' : 'light'} active now).
        </p>
      </SectionCard>
    </div>
  )
}

function ThemeOption({
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: typeof Sun
  label: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200',
        active
          ? 'border-indigo-400/40 bg-indigo-500/10 shadow-[0_0_16px_rgba(124,92,255,0.15)]'
          : 'border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          active ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/[0.05] dark:text-slate-400',
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span>
        <span className={cn('block text-[13.5px] font-semibold', active ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-900 dark:text-slate-100')}>
          {label}
        </span>
        <span className="mt-0.5 block text-[12px] text-slate-500 dark:text-slate-400">{description}</span>
      </span>
    </button>
  )
}

function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotifPrefs>(readPrefs)

  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
  }, [prefs])

  const rows: Array<{ id: keyof NotifPrefs; label: string; description: string }> = [
    { id: 'email', label: 'Email Notifications', description: 'Receive email digests for important admissions activity.' },
    { id: 'leads', label: 'Lead Notifications', description: 'Alert me when new leads arrive or intent scores change.' },
    { id: 'followUps', label: 'Follow-up Reminders', description: 'Remind me about due and overdue follow-ups.' },
    { id: 'system', label: 'System Notifications', description: 'Platform and maintenance announcements.' },
  ]

  return (
    <SectionCard
      title="Notification Preferences"
      description="Choose what reaches your notification center. Stored locally in this browser."
    >
      <ul className="divide-y divide-white/5">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
            <div>
              <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{row.label}</p>
              <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{row.description}</p>
            </div>
            <Toggle
              id={`pref-${row.id}`}
              checked={prefs[row.id]}
              onChange={(checked) => setPrefs((p) => ({ ...p, [row.id]: checked }))}
              label={row.label}
            />
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

function CommunicationSettings() {
  return (
    <div className="space-y-5">
      <EmailConfigSettings />
      <SectionCard
        title="Email Defaults"
        description="Defaults used when composing messages."
      >
        <EmailDefaultsSettings />
      </SectionCard>
    </div>
  )
}

function EmailConfigSettings() {
  const fetcher = useCallback(() => getEmailConfig(), [])
  const { data, loading, error, retry } = useAsyncData(fetcher)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testEmailConfig()
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <SectionCard title="Email Configuration" description="SMTP settings for email delivery.">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
          <button type="button" onClick={retry} className="ml-2 underline">Retry</button>
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-slate-900 dark:text-white">Status:</span>
            <Badge variant={data.configured ? 'success' : 'warning'} dot>
              {data.configured ? 'Configured' : 'Not configured'}
            </Badge>
          </div>

          {data.configured ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">SMTP Host</dt>
                <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">{data.host}</dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">SMTP Port</dt>
                <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">{data.port}</dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">From Email</dt>
                <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">{data.fromEmail}</dd>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">TLS Enabled</dt>
                <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">{data.tlsEnabled ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300">
              <p className="font-semibold">SMTP is not configured.</p>
              <p className="mt-1 text-[12px]">Set <code className="rounded bg-amber-100 px-1 py-0.5 text-[11px] dark:bg-amber-500/20">SMTP_HOST</code> and <code className="rounded bg-amber-100 px-1 py-0.5 text-[11px] dark:bg-amber-500/20">SMTP_FROM</code> in backend/.env to enable real email delivery.</p>
            </div>
          )}

          {testResult && (
            <div className={cn(
              'rounded-lg border px-3 py-2 text-[12.5px] font-medium',
              testResult.success
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-300',
            )}>
              {testResult.message}
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={handleTest} disabled={testing}>
            {testing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing…</> : 'Test Email Configuration'}
          </Button>
        </div>
      ) : null}
    </SectionCard>
  )
}

function EmailDefaultsSettings() {
  const [sender, setSender] = useState('admissions@edtech-ai.com')
  const [signature, setSignature] = useState('Best regards,\nThe EDTECH AI Admissions Team')

  return (
    <div className="space-y-4">
      <Field id="default-sender" label="Default Sender" hint="Shown as the From address on composed messages.">
        <input id="default-sender" type="text" value={sender} onChange={(e) => setSender(e.target.value)} className={inputClass} />
      </Field>
      <Field id="signature" label="Signature">
        <textarea
          id="signature"
          rows={3}
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          className={cn(inputClass, 'h-auto resize-none py-2')}
        />
      </Field>
    </div>
  )
}

function SecuritySettings({ user }: { user: { name: string; email: string; role: string; id?: string } | null }) {
  return (
    <div className="space-y-5">
      <SectionCard
        title="Security / Session"
        description="Your current authentication session details."
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Authentication</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Active</span>
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Session</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Secure</span>
              </dd>
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Role</dt>
              <dd className="mt-0.5 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                <Badge variant="brand">{user?.role ?? '—'}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Token Status</dt>
              <dd className="mt-0.5 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">Active</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Last Authenticated</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">
                {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">JWT Provider</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">HS256</dd>
            </div>
          </dl>
        </div>
      </SectionCard>

      <SectionCard
        title="Security Actions"
        description="Manage your current session."
      >
        <div className="flex flex-wrap gap-3">
          <SecurityAction label="Sign out" description="Sign out from this session." variant="primary" />
          <SecurityAction label="Sign out of all sessions" description="Revoke all refresh tokens across all devices." variant="danger" />
        </div>
      </SectionCard>
    </div>
  )
}

function SecurityAction({ label, description, variant }: { label: string; description: string; variant: 'primary' | 'danger' }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/[0.03] px-4 py-3 dark:border-white/10">
      <div>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-[12px] text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <Button
        variant={variant === 'danger' ? 'danger' : 'primary'}
        size="sm"
        onClick={() => {
          if (variant === 'primary') {
            window.dispatchEvent(new Event('signout-request'))
          }
        }}
      >
        {label}
      </Button>
    </div>
  )
}

function ProfileSettings({ user }: { user: { name: string; email: string; role: string } | null }) {
  return (
    <SectionCard title="Profile" description="Your signed-in account information (from the backend session).">
      <div className="flex items-center gap-4">
        <Avatar name={user?.name ?? 'Account'} size="lg" />
        <div>
          <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{user?.name ?? '—'}</p>
          <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{user?.email ?? '—'}</p>
          <p className="mt-0.5 text-[11.5px] font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {user?.role ?? '—'}
          </p>
        </div>
      </div>
      <dl className="mt-5 grid gap-3 border-t border-slate-200 dark:border-white/10 pt-5 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Name</dt>
          <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">{user?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Email</dt>
          <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">{user?.email ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Role</dt>
          <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">{user?.role ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Account ID</dt>
          <dd className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-slate-100">{(user as { id?: string } | null)?.id ?? '—'}</dd>
        </div>
      </dl>
    </SectionCard>
  )
}

function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50',
        checked ? 'bg-gradient-to-r from-violet-600 to-purple-600' : 'bg-slate-300 dark:bg-white/15',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

function SaveBar({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3">
      {saved && (
        <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">Saved locally ✓</span>
      )}
      <button
        type="button"
        onClick={onSave}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-violet-600/25 transition-all duration-200 hover:-translate-y-px hover:shadow-violet-600/35"
      >
        <Save className="h-4 w-4" />
        Save Changes
      </button>
    </div>
  )
}

/** Real-time system health status from the backend admin API. */
function SystemHealth() {
  const fetcher = useCallback(() => getAdminHealth(), [])
  const { data, loading, error, retry } = useAsyncData(fetcher)

  return (
    <SectionCard
      title="System Health"
      description="Live backend status — database, AI, email and system info."
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-300">
          <p className="font-semibold">
            {error.includes('permission') || error.includes('403')
              ? 'Access denied'
              : 'Could not reach backend'}
          </p>
          <p className="mt-0.5">{error}</p>
          <button type="button" onClick={retry} className="mt-2 text-[12px] font-semibold text-rose-600 underline dark:text-rose-400">
            Retry
          </button>
        </div>
      ) : data ? (
        <div className="space-y-4">
          <HealthRow label="Database" status={data.database?.status} detail={data.database?.users !== undefined ? `${data.database.users} users · ${data.database.leads} leads` : undefined} />
          <HealthRow label="AI Provider" status={data.ai?.status} detail={`${data.ai?.provider} · ${data.ai?.model}`} />
          <HealthRow label="Email" status={data.email?.status} detail={data.email?.mode} />
          <HealthRow label="System" status="ok" detail={`${data.system?.version} · ${data.system?.environment} · uptime ${data.system?.uptime}`} />
        </div>
      ) : null}
    </SectionCard>
  )
}

function HealthRow({ label, status, detail }: { label: string; status?: string; detail?: string }) {
  const isOk = status === 'ok' || status === 'connected' || status === 'available' || status === 'configured'
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/[0.03] px-4 py-3 dark:border-white/10">
      <div className="flex items-center gap-3">
        <span className={cn('h-2.5 w-2.5 rounded-full', isOk ? 'bg-emerald-500' : 'bg-amber-500')} />
        <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{label}</span>
      </div>
      <div className="text-right">
        <span className={cn('text-[12px] font-medium', isOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
          {status ?? 'unknown'}
        </span>
        {detail && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{detail}</p>}
      </div>
    </div>
  )
}


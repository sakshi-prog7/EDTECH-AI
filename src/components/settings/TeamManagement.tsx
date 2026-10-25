import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, UserPlus, Users } from 'lucide-react'

import { Badge } from '@/components/common/Badge'
import type { BadgeVariant } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Modal } from '@/components/common/Modal'
import { SelectInput, TextInput } from '@/components/common/FormField'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/common/Skeleton'
import { useAsyncData } from '@/hooks/useAsyncData'
import { createAdminUser, listUsers, setUserActive, setUserRole } from '@/services/crmApi'
import type { AdminUser } from '@/services/crmApi'
import { ApiError } from '@/services/authApi'
import { useAuth } from '@/context/AuthContext'

const ROLE_VARIANT: Record<string, BadgeVariant> = {
  ADMIN: 'danger',
  COUNSELOR: 'brand',
  ADMISSIONS: 'info',
  STUDENT: 'neutral',
}

const ROLES = ['ADMIN', 'COUNSELOR', 'ADMISSIONS', 'STUDENT']

export function TeamManagement() {
  const { user: currentUser } = useAuth()
  const fetcher = useCallback(() => listUsers(), [])
  const { data, loading, error, retry } = useAsyncData(fetcher)
  const [createOpen, setCreateOpen] = useState(false)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  const users = data?.users ?? []

  const changeRole = async (u: AdminUser, role: AdminUser['role']) => {
    try {
      await setUserRole(u.id, role)
      setToast({ kind: 'success', message: `${u.name} is now ${role}.` })
      retry()
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof ApiError ? err.message : 'Could not update the role.' })
    }
  }

  const toggleActive = async (u: AdminUser) => {
    try {
      await setUserActive(u.id, !u.is_active)
      setToast({ kind: 'success', message: u.is_active ? `${u.name} deactivated.` : `${u.name} activated.` })
      retry()
    } catch (err) {
      setToast({ kind: 'error', message: err instanceof ApiError ? err.message : 'Could not update the account.' })
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Team &amp; Roles</h2>
          <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
            Admin only — manage user roles and account status. Roles are enforced server-side on every request.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" />
          Invite User
        </Button>
      </div>

      {toast && (
        <p
          className={`mt-4 rounded-lg border px-3 py-2 text-[12.5px] font-medium ${
            toast.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
          }`}
          role="status"
        >
          {toast.message}
        </p>
      )}

      <div className="mt-5">
        {loading ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Invite your first team member to get started." className="py-12" />
        ) : (
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <caption className="sr-only">Team members and their roles</caption>
              <thead>
                <tr className="border-y border-slate-200 bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-500 dark:border-white/10">
                  <th scope="col" className="px-4 py-2.5 font-semibold">User</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Role</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-[#FAF7FF] dark:hover:bg-white/[0.04]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <ShieldCheck className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                              {u.name}
                              {isSelf && <span className="ml-1.5 text-[10.5px] font-medium text-indigo-500">(you)</span>}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <Badge variant={ROLE_VARIANT[u.role] ?? 'neutral'}>{u.role}</Badge>
                        ) : (
                          <select
                            aria-label={`Role for ${u.name}`}
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value as AdminUser['role'])}
                            className="h-7 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-2 pr-6 text-[11.5px] font-medium text-slate-800 outline-none transition-colors hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.is_active ? 'success' : 'neutral'} dot>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isSelf && (
                          <Button
                            variant={u.is_active ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() => toggleActive(u)}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); retry() }} />
    </Card>
  )
}

function InviteModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>('COUNSELOR')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setEmail('')
    setPassword('')
    setRole('COUNSELOR')
    setErrors({})
  }, [open])

  const submit = async () => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = 'Name must be at least 2 characters.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.'
    if (password.length < 8) e.password = 'Password must be at least 8 characters.'
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setBusy(true)
    try {
      await createAdminUser({ name: name.trim(), email: email.trim(), password, role: role as AdminUser['role'] })
      onCreated()
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite a team member"
      description="Creates the account immediately — share the credentials securely with the new member."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errors.form && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {errors.form}
          </p>
        )}
        <TextInput id="invite-name" label="Full name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Rahul Verma" />
        <TextInput id="invite-email" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="team@edtech.ai" />
        <TextInput id="invite-password" label="Temporary password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="At least 8 characters. Stored hashed (scrypt) — never in plain text." />
        <SelectInput
          id="invite-role"
          label="Role"
          options={ROLES.map((r) => ({ value: r, label: r }))}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>
    </Modal>
  )
}

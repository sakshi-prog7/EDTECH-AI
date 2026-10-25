import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, CircleAlert, KeyRound, Loader2, Lock, Mail } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Brand } from '@/components/common/Brand'
import { Button } from '@/components/common/Button'
import { useAuth } from '@/context/AuthContext'
import { ApiError, apiRequest } from '@/services/authApi'

const FEATURES = [
  'AI-powered lead scoring',
  'Personalized course recommendations',
  'Enrollment forecasting & analytics',
]

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@edtech.ai' },
  { role: 'Counselor', email: 'counselor@edtech.ai' },
  { role: 'Admissions', email: 'admissions@edtech.ai' },
  { role: 'Student', email: 'student@edtech.ai' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, offline } = useAuth()
  const [email, setEmail] = useState('admin@edtech.ai')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotToken, setForgotToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [forgotNotice, setForgotNotice] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to sign in. Check that the backend is running (cd backend && py -3.11 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000).'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgot = async (event: FormEvent) => {
    event.preventDefault()
    setForgotNotice(null)
    try {
      const data = await apiRequest<{ message: string; demoResetToken?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: forgotEmail.trim() },
        skipAuth: true,
        timeoutMs: 8000,
      })
      setForgotNotice(data.message)
      setForgotToken(data.demoResetToken ?? '')
    } catch (err) {
      setForgotNotice(err instanceof Error ? err.message : 'Could not request a password reset.')
    }
  }

  const handleReset = async (event: FormEvent) => {
    event.preventDefault()
    setForgotNotice(null)
    try {
      const data = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: { token: forgotToken, password: newPassword },
        skipAuth: true,
        timeoutMs: 8000,
      })
      setForgotNotice(data.message)
      setForgotToken('')
      setNewPassword('')
    } catch (err) {
      setForgotNotice(err instanceof Error ? err.message : 'Could not reset the password.')
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Photo panel — real education photography, clean white design */}
      <div className="relative hidden w-[46%] overflow-hidden lg:block">
        <img
          src="/images/hero-students.jpg"
          alt="Diverse college students collaborating on a laptop in a modern library, guided by a counsellor"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/25 to-slate-900/10" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
          <Link to="/" aria-label="EDTECH AI — back to Home" className="inline-block">
            <Brand light size="lg" />
          </Link>

          <div>
            <h1 className="max-w-md text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              Admissions intelligence for the AI era.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
              EDTECH AI helps institutes score leads, personalize outreach, and forecast
              enrollments — all from one command center.
            </p>
            <ul className="mt-8 space-y-3 text-sm font-medium text-white/90">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/70">© 2026 EDTECH AI · EDTECH AI Platform</p>
        </div>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Link to="/" aria-label="EDTECH AI — back to Home" className="inline-block">
              <Brand size="lg" />
            </Link>
          </div>

          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sign in to continue to EDTECH AI.
          </p>

          {offline && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50 px-3.5 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-[12.5px] leading-relaxed text-amber-800 dark:text-amber-200">
                The EDTECH AI backend is not reachable. Start it with{' '}
                <code className="rounded bg-amber-100 px-1 py-0.5 text-[11.5px] dark:bg-amber-500/20">py -3.11 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000</code>{' '}
                before signing in.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[13px] font-medium text-slate-700 dark:text-slate-300"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@institute.edu"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot((v) => !v)}
                  className="text-[13px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 dark:border-rose-400/25 dark:bg-rose-500/[0.07]">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <p className="text-[12.5px] leading-relaxed text-rose-800 dark:text-rose-200">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {showForgot && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                <KeyRound className="h-4 w-4 text-indigo-500" />
                Reset your password
              </p>
              <form onSubmit={handleForgot} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="Account email"
                  aria-label="Account email"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <Button type="submit" variant="secondary" size="sm" className="w-full">
                  Send reset request
                </Button>
              </form>
              {forgotNotice && (
                <p className="mt-2.5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{forgotNotice}</p>
              )}
              {forgotToken && (
                <form onSubmit={handleReset} className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-white/10">
                  <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                    No mailer is configured, so here is your one-time reset token (demo only):{' '}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[10.5px] dark:bg-white/10">{forgotToken}</code>
                  </p>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="New password (min 8 chars, incl. a number)"
                    aria-label="New password"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <Button type="submit" variant="secondary" size="sm" className="w-full">
                    Set new password
                  </Button>
                </form>
              )}
            </div>
          )}

          <p className="mt-4 text-center text-[13px] text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              Create one
            </Link>
          </p>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            <p className="mb-1.5 font-semibold text-slate-700 dark:text-slate-200">
              Demo accounts (password: demo1234)
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword('demo1234')
                    setError(null)
                  }}
                  className="flex items-center gap-1.5 text-left text-[11.5px] text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
                >
                  <span className="font-medium">{account.role}</span>
                  <span className="truncate text-slate-500 dark:text-slate-400">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

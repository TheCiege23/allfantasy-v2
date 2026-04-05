'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Mail, Loader2, CheckCircle2, Phone, Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { AuthStatusHeader, AuthStatusShell } from '@/components/auth/AuthStatusShell'
import {
  isValidPhoneE164,
  normalizePhoneE164,
} from '@/lib/auth/ForgotPasswordFlowController'
import { resolvePasswordResetErrorMessage } from '@/lib/auth/AuthErrorMessageResolver'
import {
  requestPasswordResetByEmail,
  requestPasswordResetBySms,
} from '@/lib/auth/PasswordRecoveryService'
import {
  resetPasswordWithCode,
  verifyResetCode,
} from '@/lib/auth/ResetCodeVerificationService'

type Method = 'email' | 'sms'
type Step = 'choose' | 'request' | 'enter_code' | 'success'

function RecoveryPage(props: {
  backHref: string
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <AuthStatusShell>
      <div className="w-full max-w-[440px]">
        <Link
          href={props.backHref}
          className="mb-6 inline-flex items-center gap-2 rounded-[10px] border border-violet-400/30 bg-[#1c1535] px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-violet-300/45 hover:bg-[#211a3e] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sign In</span>
        </Link>
        <AuthStatusHeader title={props.title} subtitle={props.subtitle} />
        {props.children}
        {props.footer ? (
          <div className="mt-5 text-center text-sm text-white/55">{props.footer}</div>
        ) : null}
      </div>
    </AuthStatusShell>
  )
}

function RecoveryCard({
  children,
  danger = false,
}: {
  children: ReactNode
  danger?: boolean
}) {
  return (
    <div
      className={`rounded-[18px] border bg-[#16102a] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${
        danger ? 'border-red-500/20' : 'border-violet-400/20'
      }`}
    >
      {children}
    </div>
  )
}

function RecoveryError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>{error}</div>
      </div>
    </div>
  )
}

export default function ForgotPasswordClient() {
  const searchParams = useSearchParams()
  const forceEmail = searchParams?.get('method') === 'email'
  const requestedReturnTo = searchParams?.get('returnTo') || ''
  const safeReturnTo = requestedReturnTo.startsWith('/') ? requestedReturnTo : '/dashboard'
  const loginHref = `/login?callbackUrl=${encodeURIComponent(safeReturnTo)}`

  const [method, setMethod] = useState<Method | null>(forceEmail ? 'email' : null)
  const [step, setStep] = useState<Step>(forceEmail ? 'request' : 'choose')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeVerified, setCodeVerified] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)

  async function handleRequestEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const emailValue = email.trim().toLowerCase()
    if (!emailValue) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    setCodeVerified(false)
    try {
      const res = await requestPasswordResetByEmail({
        email: emailValue,
        returnTo: safeReturnTo,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message || 'Could not send code. Try again.')
      } else {
        setStep('enter_code')
        setError(null)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestSms(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!phone.trim()) {
      setError('Please enter your phone number.')
      return
    }
    const normalized = normalizePhoneE164(phone)
    if (!isValidPhoneE164(normalized)) {
      setError('Enter a valid phone number with country code (e.g. +1 555 123 4567).')
      return
    }
    setLoading(true)
    setCodeVerified(false)
    try {
      const res = await requestPasswordResetBySms({
        phone: normalized,
        returnTo: safeReturnTo,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || 'Could not send code. Try email reset or try again later.')
      } else {
        setStep('enter_code')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendCode() {
    setError(null)
    setCodeVerified(false)
    const payload =
      method === 'email'
        ? { type: 'email', email: email.trim().toLowerCase(), returnTo: safeReturnTo }
        : { type: 'sms', phone: normalizePhoneE164(phone), returnTo: safeReturnTo }
    if (method === 'email' && !email.trim()) return
    if (method === 'sms' && !isValidPhoneE164(String(payload.phone ?? ''))) return
    setResendLoading(true)
    try {
      const res =
        method === 'email'
          ? await requestPasswordResetByEmail({
              email: String(payload.email ?? ''),
              returnTo: safeReturnTo,
            })
          : await requestPasswordResetBySms({
              phone: String(payload.phone ?? ''),
              returnTo: safeReturnTo,
            })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message || 'Could not resend code. Try again in a minute.')
      } else {
        setError(null)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  async function handleConfirmCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!codeVerified) {
      setError('Verify your code before saving a new password.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password must include at least one letter and one number.')
      return
    }
    const payload =
      method === 'email'
        ? { email: email.trim().toLowerCase(), code: code.trim(), newPassword }
        : { phone: normalizePhoneE164(phone), code: code.trim(), newPassword }
    setLoading(true)
    try {
      const res = await resetPasswordWithCode(payload)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(resolvePasswordResetErrorMessage(data?.error))
      } else {
        setStep('success')
        setTimeout(() => {
          window.location.href = `${loginHref}&reset=1`
        }, 2000)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode() {
    setError(null)
    if (code.trim().length !== 6) {
      setError('Enter your 6-digit code.')
      return
    }
    const payload =
      method === 'email'
        ? { email: email.trim().toLowerCase(), code: code.trim() }
        : { phone: normalizePhoneE164(phone), code: code.trim() }

    setVerifyingCode(true)
    try {
      const res = await verifyResetCode(payload)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCodeVerified(false)
        setError(resolvePasswordResetErrorMessage(data?.error))
      } else {
        setCodeVerified(true)
      }
    } catch {
      setCodeVerified(false)
      setError('Something went wrong. Please try again.')
    } finally {
      setVerifyingCode(false)
    }
  }

  if (step === 'choose') {
    return (
      <RecoveryPage
        backHref={loginHref}
        title="Reset your password"
        subtitle="Choose how you want to receive your recovery code."
        footer={
          <>
            Need an account?{' '}
            <Link
              href={`/signup?next=${encodeURIComponent(safeReturnTo)}`}
              className="font-semibold text-cyan-400 transition hover:opacity-80"
            >
              Sign up
            </Link>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMethod('email')
              setStep('request')
              setError(null)
              setCodeVerified(false)
            }}
            className="rounded-[18px] border border-violet-400/20 bg-[#16102a] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-[#1c1535]"
          >
            <Mail className="mx-auto h-8 w-8 text-cyan-400" />
            <div className="mt-3 text-sm font-semibold text-white">Email</div>
            <div className="mt-1 text-xs text-white/50">Send a reset code to your email</div>
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod('sms')
              setStep('request')
              setError(null)
              setCodeVerified(false)
            }}
            className="rounded-[18px] border border-violet-400/20 bg-[#16102a] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-[#1c1535]"
          >
            <Phone className="mx-auto h-8 w-8 text-emerald-400" />
            <div className="mt-3 text-sm font-semibold text-white">SMS</div>
            <div className="mt-1 text-xs text-white/50">Send a reset code to your phone</div>
          </button>
        </div>
      </RecoveryPage>
    )
  }

  if (step === 'request' && method === 'email') {
    return (
      <RecoveryPage
        backHref={loginHref}
        title="Reset via email"
        subtitle="Enter your email. If an account exists, we'll only send a code to that address."
        footer={
          <button
            type="button"
            onClick={() => {
              setStep('choose')
              setMethod(null)
              setCodeVerified(false)
            }}
            className="text-sm text-white/55 transition hover:text-white/80"
          >
            Use SMS instead
          </button>
        }
      >
        <RecoveryError error={error} />
        <RecoveryCard>
          <form onSubmit={handleRequestEmail} className="space-y-4">
            <div>
              <label className="text-[13px] font-semibold tracking-[0.02em] text-white/60">Email address</label>
              <div className="relative mt-1.5">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-[10px] border border-violet-400/30 bg-[#1c1535] px-3.5 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="you@example.com"
                  disabled={loading}
                  autoFocus
                />
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <span>Send code</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </RecoveryCard>
      </RecoveryPage>
    )
  }

  if (step === 'request' && method === 'sms') {
    return (
      <RecoveryPage
        backHref={loginHref}
        title="Reset via SMS"
        subtitle="Enter the phone number on your account and we'll send a 6-digit code."
        footer={
          <button
            type="button"
            onClick={() => {
              setStep('choose')
              setMethod(null)
              setError(null)
              setCodeVerified(false)
            }}
            className="text-sm text-white/55 transition hover:text-white/80"
          >
            Use email instead
          </button>
        }
      >
        <RecoveryError error={error} />
        <RecoveryCard>
          <form onSubmit={handleRequestSms} className="space-y-4">
            <div>
              <label className="text-[13px] font-semibold tracking-[0.02em] text-white/60">Phone number</label>
              <div className="relative mt-1.5">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  autoComplete="tel"
                  className="w-full rounded-[10px] border border-violet-400/30 bg-[#1c1535] px-3.5 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="+1 (555) 123-4567"
                  disabled={loading}
                  autoFocus
                />
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <span>Send code</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </RecoveryCard>
      </RecoveryPage>
    )
  }

  if (step === 'enter_code') {
    return (
      <RecoveryPage
        backHref={loginHref}
        title="Enter code and new password"
        subtitle={
          method === 'email'
            ? `Check your inbox. If ${email || 'that email'} has an account, a code is on its way. Enter it below with your new password.`
            : `Check your messages. If this number has an account on file, a code is on its way. Enter it below with your new password.`
        }
      >
        <RecoveryError error={error} />
        <RecoveryCard>
          <form onSubmit={handleConfirmCode} className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-[13px] font-semibold tracking-[0.02em] text-white/60">6-digit code</label>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading || loading}
                  className="text-xs font-medium text-cyan-400 transition hover:opacity-80 disabled:opacity-50"
                >
                  {resendLoading ? 'Sending...' : 'Resend code'}
                </button>
              </div>
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setCodeVerified(false)
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="mt-1.5 w-full rounded-[10px] border border-violet-400/30 bg-[#1c1535] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
                placeholder="000000"
                disabled={loading}
                autoFocus
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || loading || code.length !== 6}
                  className="rounded-[10px] border border-violet-400/30 bg-[#1c1535] px-3.5 py-2 text-xs font-medium text-white/80 transition hover:border-violet-300/45 hover:bg-[#211a3e] disabled:opacity-50"
                >
                  {verifyingCode ? 'Verifying...' : 'Verify code'}
                </button>
                {codeVerified ? (
                  <span className="text-xs font-medium text-emerald-300">Code verified</span>
                ) : null}
              </div>
            </div>

            <div>
              <label className="text-[13px] font-semibold tracking-[0.02em] text-white/60">New password</label>
              <div className="relative mt-1.5">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full rounded-[10px] border border-violet-400/30 bg-[#1c1535] px-3.5 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="At least 8 characters, letter and number"
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/35 transition hover:text-cyan-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[13px] font-semibold tracking-[0.02em] text-white/60">Confirm new password</label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-[10px] border border-violet-400/30 bg-[#1c1535] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
                placeholder="Re-enter password"
                disabled={loading}
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !codeVerified || !newPassword || newPassword !== confirmPassword}
              className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <span>Save new password</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </RecoveryCard>
      </RecoveryPage>
    )
  }

  if (step === 'success') {
    return (
      <AuthStatusShell>
        <div className="w-full max-w-[440px]">
          <AuthStatusHeader
            title="Password reset"
            subtitle="Your password was updated successfully."
          />
          <RecoveryCard>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold text-white">Password reset</h1>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Your password has been updated. Redirecting to sign in...
              </p>
              <Link
                href={loginHref}
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
              >
                <span>Back to Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </RecoveryCard>
        </div>
      </AuthStatusShell>
    )
  }

  return null
}

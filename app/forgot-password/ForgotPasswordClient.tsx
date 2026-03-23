'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Mail, Loader2, CheckCircle2, Phone, Eye, EyeOff, TriangleAlert } from 'lucide-react'
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
    if (!emailValue) return
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
      <div className="relative min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
        <Link href={loginHref} className="absolute left-4 top-4 md:left-6 md:top-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">AllFantasy.ai</div>
            <h1 className="mt-2 text-xl font-semibold">Reset your password</h1>
            <p className="mt-1 text-sm text-white/50">Choose how to receive your reset.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setMethod('email'); setStep('request'); setError(null); setCodeVerified(false); }}
              className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition"
            >
              <Mail className="h-8 w-8 text-cyan-400" />
              <span className="text-sm font-medium">Email</span>
              <span className="text-xs text-white/50">Code to your email</span>
            </button>
            <button
              type="button"
              onClick={() => { setMethod('sms'); setStep('request'); setError(null); setCodeVerified(false); }}
              className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition"
            >
              <Phone className="h-8 w-8 text-emerald-400" />
              <span className="text-sm font-medium">SMS</span>
              <span className="text-xs text-white/50">Code to your phone</span>
            </button>
          </div>
          <p className="text-center text-xs text-white/45">
            Need an account?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(safeReturnTo)}`}
              className="text-cyan-300 hover:text-cyan-200"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    )
  }

  if (step === 'request' && method === 'email') {
    return (
      <div className="relative min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
        <Link href={loginHref} className="absolute left-4 top-4 md:left-6 md:top-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-2">
            <h1 className="text-xl font-semibold">Reset via email</h1>
            <p className="mt-1 text-sm text-white/50">Enter your email and we&apos;ll send a 6-digit reset code.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl">
            <form onSubmit={handleRequestEmail} className="space-y-3">
              <div>
                <label className="text-xs text-white/60">Email address</label>
                <div className="relative">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 pl-10 text-sm outline-none focus:border-white/20"
                    placeholder="you@example.com"
                    disabled={loading}
                    autoFocus
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 transition-all"
              >
                {loading ? <span className="inline-flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending...</span> : 'Send code'}
              </button>
            </form>
          </div>
          <p className="text-center">
            <button type="button" onClick={() => { setStep('choose'); setMethod(null); setCodeVerified(false); }} className="text-xs text-white/50 hover:text-white/80">
              Use SMS instead
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (step === 'request' && method === 'sms') {
    return (
      <div className="relative min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
        <Link href={loginHref} className="absolute left-4 top-4 md:left-6 md:top-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-2">
            <h1 className="text-xl font-semibold">Reset via SMS</h1>
            <p className="mt-1 text-sm text-white/50">Enter the phone number on your account. We&apos;ll send a 6-digit code.</p>
          </div>
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 flex items-start gap-2">
              <TriangleAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl">
            <form onSubmit={handleRequestSms} className="space-y-3">
              <div>
                <label className="text-xs text-white/60">Phone number</label>
                <div className="relative">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    autoComplete="tel"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 pl-10 text-sm outline-none focus:border-white/20"
                    placeholder="+1 (555) 123-4567"
                    disabled={loading}
                    autoFocus
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 transition-all"
              >
                {loading ? <span className="inline-flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending...</span> : 'Send code'}
              </button>
            </form>
          </div>
          <p className="text-center">
            <button type="button" onClick={() => { setStep('choose'); setMethod(null); setError(null); setCodeVerified(false); }} className="text-xs text-white/50 hover:text-white/80">
              Use email instead
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (step === 'enter_code') {
    return (
      <div className="relative min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
        <Link href={loginHref} className="absolute left-4 top-4 md:left-6 md:top-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-2">
            <h1 className="text-xl font-semibold">Enter code and new password</h1>
            <p className="mt-1 text-sm text-white/50">
              {method === 'email'
                ? `We sent a code to ${email || 'your email'}.`
                : `We sent a code to ${phone || 'your phone'}.`} Enter it below with your new password.
            </p>
          </div>
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 flex items-start gap-2">
              <TriangleAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl">
            <form onSubmit={handleConfirmCode} className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-white/60">6-digit code</label>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendLoading || loading}
                    className="text-xs text-cyan-400/80 hover:text-cyan-300 disabled:opacity-50 transition"
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
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-white/20 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="000000"
                  disabled={loading}
                  autoFocus
                />
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || loading || code.length !== 6}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50 transition"
                  >
                    {verifyingCode ? 'Verifying...' : 'Verify code'}
                  </button>
                  {codeVerified && (
                    <span className="text-xs text-emerald-300">Code verified</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/60">New password</label>
                <div className="relative">
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 pr-10 text-sm outline-none focus:border-white/20"
                    placeholder="At least 8 characters, letter and number"
                    disabled={loading}
                    minLength={8}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/60">Confirm new password</label>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-white/20"
                  placeholder="Re-enter password"
                  disabled={loading}
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !codeVerified || !newPassword || newPassword !== confirmPassword}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 transition-all"
              >
                {loading ? <span className="inline-flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span> : 'Save new password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl text-center space-y-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
          <h1 className="text-xl font-semibold">Password reset</h1>
          <p className="text-sm text-white/60">Your password has been updated. Redirecting to sign in...</p>
          <Link href={loginHref} className="inline-block rounded-xl bg-white/10 border border-white/10 px-6 py-2.5 text-sm font-medium hover:bg-white/15 transition">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return null
}

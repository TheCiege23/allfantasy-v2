'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, Shield, TriangleAlert } from 'lucide-react'

/** Only allow `next` that points inside `/admin` — matches the consume route's sanitizer. */
function sanitizeNext(raw: string | null | undefined): string {
  if (!raw) return '/admin'
  if (!raw.startsWith('/')) return '/admin'
  if (raw.startsWith('//')) return '/admin'
  if (!raw.startsWith('/admin')) return '/admin'
  return raw
}

export default function AdminLoginContent() {
  const searchParams = useSearchParams()
  const next = sanitizeNext(searchParams?.get('next'))
  const errCode = searchParams?.get('err')

  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const banner = useMemo(() => {
    if (errCode === 'magic') {
      return 'That link is no longer valid. Magic links expire after 10 minutes — request a new one below.'
    }
    return null
  }, [errCode])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMsg('Enter a valid email.')
      setState('error')
      return
    }
    setErrorMsg(null)
    setState('submitting')
    try {
      const res = await fetch('/api/auth/admin-magic/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, next }),
      })
      if (!res.ok) {
        setErrorMsg('Request failed. Try again in a moment.')
        setState('error')
        return
      }
      // The backend always returns {ok:true} to prevent email enumeration.
      // We can't tell here whether the email is on the allowlist — just confirm "check your inbox if eligible."
      setState('sent')
    } catch {
      setErrorMsg('Network error. Try again.')
      setState('error')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0f1a] px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-[13px] uppercase tracking-[0.2em] text-white/50">
          <Shield className="h-4 w-4 text-violet-400" />
          <span>AllFantasy Admin</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur">
          <h1 className="text-[20px] font-bold text-white">Admin sign in</h1>
          <p className="mt-1 text-[13px] leading-snug text-white/55">
            Enter your admin email. If you&rsquo;re on the allowlist, we&rsquo;ll send a one-time magic link
            that expires in 10 minutes.
          </p>

          {banner ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{banner}</span>
            </div>
          ) : null}

          {state === 'sent' ? (
            <div
              role="status"
              className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-[13px] text-emerald-100"
            >
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Check your email
              </div>
              <p className="mt-1 text-[12px] text-emerald-100/80">
                If <span className="font-mono">{email}</span> is on the admin allowlist, a magic link is on
                the way. It expires in 10 minutes. You can close this tab after clicking the link.
              </p>
              <button
                type="button"
                onClick={() => {
                  setState('idle')
                  setErrorMsg(null)
                }}
                className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 underline underline-offset-4 hover:text-emerald-100"
              >
                Send to a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-white/55">
                  Admin email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={state === 'submitting'}
                  placeholder="you@allfantasy.ai"
                  className="w-full rounded-lg border border-white/10 bg-[#121725] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-violet-500/50 disabled:opacity-60"
                />
              </label>

              {state === 'error' && errorMsg ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100"
                >
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={state === 'submitting'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-400 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state === 'submitting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending link…
                  </>
                ) : (
                  'Email me a magic link'
                )}
              </button>

              {next !== '/admin' ? (
                <p className="text-center text-[10px] text-white/40">
                  After sign-in, you&rsquo;ll be sent to <span className="font-mono">{next}</span>
                </p>
              ) : null}
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-white/40">
          Not an admin?{' '}
          <Link href="/login" className="font-semibold text-white/70 underline underline-offset-4 hover:text-white">
            Regular sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import '@/components/core-app/af-auth.css'
import { isSocialProviderEnabled } from '@/lib/auth/SocialProviderResolver'

/**
 * Auth — the "landing, auth & import" handoff, frames 4A and 4B.
 *
 * 440px cards at radius 16, fields as 14px-padded rows on --surface with a
 * --accent focus ring, exactly as the handoff specifies.
 *
 * ⚠ THE OAUTH ROW IS NOT FOUR EQUAL BUTTONS. The handoff draws Google, Apple,
 * Discord and Facebook side by side as if all four work. They do not:
 * lib/auth/SocialProviderResolver keeps a MANUALLY_SUSPENDED_PROVIDERS set that
 * currently holds Facebook (Meta platform review), and Apple is gated on
 * credentials that may be absent. This screen asks that resolver rather than
 * hardcoding the four, and a provider that cannot complete a sign-in is shown
 * disabled and labelled — offering someone a sign-in button that silently fails
 * is worse than not offering it.
 *
 * ⚠ SIGN-UP IS GATED ON TWO CHECKBOXES, per the README — the fantasy-sports
 * disclaimer and the Terms — and the form NAMES WHICH ONE IS MISSING. The
 * design.html prototype draws a single combined checkbox; the README is
 * authoritative where the two disagree, and it is also the safer reading: a
 * combined tick makes one consent stand in for two different agreements, one of
 * which is a gambling-law disclaimer.
 */

export type AuthMode = 'signin' | 'signup'

const PROVIDERS = [
  { id: 'google' as const, label: 'Google' },
  { id: 'apple' as const, label: 'Apple' },
  { id: 'discord' as const, label: 'Discord' },
  { id: 'facebook' as const, label: 'Facebook' },
]

function OAuthGrid() {
  return (
    <div className="af-au-oauth">
      <div className="af-au-divider">
        <span className="af-label">Or continue with</span>
      </div>
      <div className="af-au-oauth-grid">
        {PROVIDERS.map((p) => {
          const enabled = isSocialProviderEnabled(p.id)
          return (
            <button
              key={p.id}
              type="button"
              className="af-au-oauth-btn"
              disabled={!enabled}
              aria-disabled={!enabled}
              // Naming the state matters: a greyed button with no explanation
              // reads as a loading state, not as an unavailable provider.
              title={enabled ? `Continue with ${p.label}` : `${p.label} — coming soon`}
            >
              <span className="af-au-oauth-label">{p.label}</span>
              {!enabled ? <span className="af-au-soon af-num">soon</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SignIn() {
  return (
    <div className="af-au-card">
      <header className="af-au-head">
        <div>
          <h1 className="af-au-title">Welcome back</h1>
          <p className="af-au-sub">Sign in to your leagues.</p>
        </div>
        <span className="af-au-switch">
          New here? <Link href="/signup">Create account</Link>
        </span>
      </header>

      <form className="af-au-form" method="post" action="/api/auth/callback/credentials">
        <label className="af-au-field">
          <span className="af-label">Email, username or phone</span>
          <input name="identifier" type="text" autoComplete="username" placeholder="you@email.com" />
        </label>

        <label className="af-au-field">
          <span className="af-au-field-head">
            <span className="af-label">Password</span>
            <Link href="/forgot-password" className="af-au-forgot">
              Forgot password?
            </Link>
          </span>
          <input name="password" type="password" autoComplete="current-password" placeholder="••••••••••" />
        </label>

        <button type="submit" className="af-btn af-au-submit">
          Sign in
        </button>
      </form>

      <OAuthGrid />
    </div>
  )
}

function SignUp() {
  const [disclaimer, setDisclaimer] = useState(false)
  const [terms, setTerms] = useState(false)
  const [attempted, setAttempted] = useState(false)

  // The form names which agreement is missing rather than reporting a generic
  // failure — with two checkboxes, "please accept the terms" does not tell the
  // user which box they skipped.
  const missing: string[] = []
  if (!disclaimer) missing.push('the fantasy-sports disclaimer')
  if (!terms) missing.push('the Terms and Privacy Policy')

  return (
    <div className="af-au-card">
      <header className="af-au-head">
        <div>
          <h1 className="af-au-title">Create your account</h1>
          <p className="af-au-sub">Step 1 of 3 · free forever for players.</p>
        </div>
        <span className="af-au-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </span>
      </header>

      <form
        className="af-au-form"
        onSubmit={(e) => {
          if (missing.length > 0) {
            e.preventDefault()
            setAttempted(true)
          }
        }}
      >
        <label className="af-au-field">
          <span className="af-label">Display name</span>
          <input name="displayName" type="text" autoComplete="nickname" placeholder="Your name" />
        </label>

        <label className="af-au-field">
          <span className="af-label">Email</span>
          <input name="email" type="email" autoComplete="email" placeholder="you@email.com" />
        </label>

        <label className="af-au-field">
          <span className="af-label">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="8+ characters"
          />
        </label>

        {/*
          Two separate agreements. The first is a gambling-law disclaimer and the
          second is the Terms — collapsing them into one tick would make a single
          click stand in for two different consents.
        */}
        <label className="af-au-check">
          <input
            type="checkbox"
            checked={disclaimer}
            onChange={(e) => setDisclaimer(e.target.checked)}
          />
          <span>
            I understand AllFantasy is <strong>season-long fantasy sports only</strong> — no
            gambling, no daily fantasy. Not available in WA.
          </span>
        </label>

        <label className="af-au-check">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>
            I agree to the <Link href="/terms">Terms</Link> and{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </span>
        </label>

        {attempted && missing.length > 0 ? (
          <p className="af-au-error" role="alert">
            Please accept {missing.join(' and ')} to continue.
          </p>
        ) : null}

        <button type="submit" className="af-btn af-au-submit">
          Create account
        </button>
      </form>

      <OAuthGrid />
    </div>
  )
}

export function AuthV4({ mode }: { mode: AuthMode }) {
  return (
    <div className="af-core af-au">
      <div className="af-au-brand">
        <span className="af-au-wordmark">AllFantasy</span>
      </div>
      {mode === 'signin' ? <SignIn /> : <SignUp />}
      <p className="af-au-legal">
        100% fantasy sports — no gambling, no DFS. Not available in WA.
      </p>
    </div>
  )
}

export default AuthV4

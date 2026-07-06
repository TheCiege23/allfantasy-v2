'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { LandingCopy } from './copy'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

type Hrefs = {
  signupHref: string
  loginHref: string
  dashboardHref: string
  commissionerSignupHref: string
}

export function FinalCtaSection({
  copy,
  journeyNote,
  isAuthenticated,
  hrefs,
}: {
  copy: LandingCopy['cta']
  journeyNote: string
  isAuthenticated: boolean
  hrefs: Hrefs
}) {
  const { signupHref, loginHref, dashboardHref, commissionerSignupHref } = hrefs

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-6 text-center sm:px-6 sm:pb-24" aria-labelledby="landing-cta">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 65% 55% at 50% 50%, color-mix(in srgb, var(--accent-cyan) 12%, transparent) 0%, transparent 70%),
            radial-gradient(ellipse 45% 40% at 40% 40%, color-mix(in srgb, var(--accent-purple) 8%, transparent) 0%, transparent 65%)
          `,
        }}
        aria-hidden="true"
      />
      <Image
        src="/brand/af-shield-transparent.png"
        alt=""
        width={584}
        height={625}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.05] sm:h-[260px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--muted2)' }}>{journeyNote}</p>
        <h2 id="landing-cta" className="mb-3 text-[34px] font-black leading-[1.0] tracking-[0.025em] sm:text-[48px] md:text-[60px]" style={{ color: 'var(--text)' }}>
          {copy.title}
        </h2>
        <p className="mx-auto mb-8 max-w-lg text-sm leading-7 sm:text-base sm:leading-8" style={{ color: 'var(--muted)' }}>
          {copy.body}
        </p>
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={isAuthenticated ? dashboardHref : signupHref}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
              style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))', color: 'var(--on-accent-bg)' }}
              data-testid="landing-cta-primary"
              onClick={() => trackLandingCtaClick({ cta_label: isAuthenticated ? copy.primaryAuthed : copy.primary, cta_destination: isAuthenticated ? dashboardHref : signupHref, cta_type: 'primary', source: 'cta-band' })}
            >
              {isAuthenticated ? copy.primaryAuthed : copy.primary}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!isAuthenticated && (
              <Link
                href={commissionerSignupHref}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:opacity-90"
                style={{ backgroundImage: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
                data-testid="landing-cta-commissioner"
                onClick={() => trackLandingCtaClick({ cta_label: copy.commissionerPrimary, cta_destination: commissionerSignupHref, cta_type: 'primary', source: 'cta-band-commissioner' })}
              >
                {copy.commissionerPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href={isAuthenticated ? dashboardHref : loginHref}
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium transition hover:-translate-y-0.5"
              style={{ background: 'color-mix(in srgb, var(--panel) 88%, transparent)', borderColor: 'var(--border)', color: 'var(--text)' }}
              data-testid="landing-cta-secondary"
              onClick={() => trackLandingCtaClick({ cta_label: isAuthenticated ? copy.secondaryAuthed : copy.secondary, cta_destination: isAuthenticated ? dashboardHref : loginHref, cta_type: 'secondary', source: 'cta-band' })}
            >
              {isAuthenticated ? copy.secondaryAuthed : copy.secondary}
            </Link>
          </div>
          {!isAuthenticated && (
            <p className="mt-1 text-center text-[11px]" style={{ color: 'var(--muted)' }}>
              {copy.commissionerNote}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { LandingCopy } from './copy'
import { GlassCard } from './shared/GlassCard'
import { SectionEyebrow } from './shared/SectionEyebrow'
import { ProgressBar } from './shared/ProgressBar'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

export function BuildLeagueSection({
  copy,
  ctaHref,
  commissionerCtaHref,
}: {
  copy: LandingCopy['journey']['buildLeague']
  ctaHref: string
  commissionerCtaHref: string
}) {
  return (
    <section
      id="landing-build-league"
      className="relative mx-4 my-6 overflow-hidden rounded-2xl border px-4 py-12 sm:mx-6 sm:px-8 sm:py-16"
      aria-labelledby="landing-build-league-heading"
      style={{
        background: 'var(--panel)',
        borderColor: 'color-mix(in srgb, #f59e0b 20%, var(--border))',
        borderLeft: '3px solid #f59e0b',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in srgb, #f59e0b 8%, transparent) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative mb-10 text-center">
        <SectionEyebrow accent="#f59e0b">★ {copy.eyebrow}</SectionEyebrow>
        <h2
          id="landing-build-league-heading"
          className="mb-3 whitespace-pre-line text-[32px] font-black leading-[1.0] tracking-[0.02em] sm:text-[46px] md:text-[58px]"
          style={{ color: 'var(--text)' }}
        >
          {copy.title}
        </h2>
        <p className="mx-auto max-w-xl text-sm leading-7 sm:text-base sm:leading-8" style={{ color: 'var(--muted)' }}>
          {copy.subtitle}
        </p>
      </div>

      {/* Moment 1 — Illustrative setup stepper (the "effortless" beat) */}
      <GlassCard className="relative mb-12 p-5 sm:p-6" accentBorder="color-mix(in srgb, #f59e0b 22%, var(--border))">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
          {copy.steps.map((step, i) => (
            <div key={step.label} className="flex-1 landing-stagger-in" style={{ animationDelay: `${i * 120}ms` }}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: 'color-mix(in srgb, #f59e0b 16%, transparent)', color: '#f59e0b' }}
                >
                  {i + 1}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{step.label}</span>
              </div>
              <p className="text-xs leading-5" style={{ color: 'var(--muted)' }}>{step.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <ProgressBar targetPct={100} accent="linear-gradient(90deg, #f59e0b, #d97706)" label={copy.inviteNote} />
        </div>
      </GlassCard>

      {/* Moment 2 — Commissioner toolkit, presented light and open (no dense grid chrome) */}
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {copy.features.map((feat, i) => (
          <div key={feat.title} className="landing-fade-in-stagger flex items-start gap-4" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: 'color-mix(in srgb, #f59e0b 10%, transparent)' }}>
              {feat.icon}
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold" style={{ color: 'var(--text)' }}>{feat.title}</h3>
              <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>{feat.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-10 flex flex-col items-center gap-3 text-center">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:opacity-90"
            style={{ backgroundImage: 'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))', color: 'var(--on-accent-bg)' }}
            onClick={() => trackLandingCtaClick({ cta_label: copy.ctaPrimary, cta_destination: ctaHref, cta_type: 'primary', source: 'build-league-section' })}
          >
            {copy.ctaPrimary}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={commissionerCtaHref}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:opacity-90"
            style={{ backgroundImage: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
            onClick={() => trackLandingCtaClick({ cta_label: copy.ctaCommissioner, cta_destination: commissionerCtaHref, cta_type: 'primary', source: 'build-league-section' })}
          >
            {copy.ctaCommissioner}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <span className="rounded-xl border px-4 py-2.5 text-xs font-medium" style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'transparent' }}>
          {copy.badgeBody}
        </span>
      </div>
    </section>
  )
}

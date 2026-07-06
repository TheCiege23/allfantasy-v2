'use client'

import type { LandingCopy } from './copy'
import { GlassCard } from './shared/GlassCard'
import { SectionEyebrow } from './shared/SectionEyebrow'
import { useCountUp } from './shared/useCountUp'

function MetricCard({ label, body, metricValue }: { label: string; body: string; metricValue: number }) {
  const { value, ref } = useCountUp<HTMLDivElement>(metricValue)
  return (
    <div ref={ref} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel2) 55%, transparent)' }}>
      <p className="mb-1 text-2xl font-black" style={{ color: 'var(--accent-purple)' }}>{value}<span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>/100</span></p>
      <p className="mb-1.5 text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
      <p className="text-xs leading-5" style={{ color: 'var(--muted)' }}>{body}</p>
    </div>
  )
}

export function DecisionOSSection({ copy }: { copy: LandingCopy['journey']['decisionOS'] }) {
  return (
    <section className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16" aria-labelledby="landing-decision-os-heading">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse 50% 45% at 50% 40%, color-mix(in srgb, var(--accent-purple) 6%, transparent) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div className="mb-8 text-center">
        <SectionEyebrow accent="var(--accent-purple)">{copy.eyebrow}</SectionEyebrow>
        <h2 id="landing-decision-os-heading" className="mb-3 whitespace-pre-line text-[24px] font-black leading-[1.05] tracking-[0.02em] sm:text-[32px] md:text-[38px]" style={{ color: 'var(--text)' }}>
          {copy.title}
        </h2>
        <p className="mx-auto max-w-lg text-sm leading-6" style={{ color: 'var(--muted)' }}>
          {copy.subtitle}
        </p>
      </div>

      <GlassCard className="p-5 sm:p-6" accentBorder="color-mix(in srgb, var(--accent-purple) 14%, var(--border))">
        <div className="grid gap-4 sm:grid-cols-3">
          {copy.cards.map((card) => (
            <MetricCard key={card.label} label={card.label} body={card.body} metricValue={card.metricValue} />
          ))}
        </div>
      </GlassCard>

      <p className="mt-5 text-center text-[11px]" style={{ color: 'var(--muted2)' }}>
        {copy.disclaimerNote}
      </p>
    </section>
  )
}

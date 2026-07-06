'use client'

import { useEffect, useState } from 'react'
import type { LandingCopy } from './copy'
import { GlassCard } from './shared/GlassCard'
import { SectionEyebrow } from './shared/SectionEyebrow'
import { GradientWord } from './shared/GradientWord'
import { ProgressBar } from './shared/ProgressBar'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ActivityTicker({ items }: { items: readonly string[] }) {
  const [index, setIndex] = useState(0)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(prefersReducedMotion())
  }, [])

  useEffect(() => {
    if (reduced || items.length <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 4200)
    return () => clearInterval(id)
  }, [reduced, items.length])

  const visible = reduced ? items.slice(-1) : [items[index]]

  return (
    <div className="space-y-1.5" role="status" aria-live="polite">
      {visible.map((item, i) => (
        <div
          key={item ?? i}
          className={reduced ? undefined : 'landing-fade-in'}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--muted)',
            padding: '6px 10px',
            borderRadius: '8px',
            background: 'color-mix(in srgb, var(--panel2) 60%, transparent)',
          }}
        >
          {item}
        </div>
      ))}
    </div>
  )
}

export function GameDaySection({ copy }: { copy: LandingCopy['journey']['gameDay'] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="landing-game-day-heading">
      <div className="mb-10 text-center">
        <SectionEyebrow accent="var(--accent-emerald-strong)">{copy.eyebrow}</SectionEyebrow>
        <h2 id="landing-game-day-heading" className="mb-3 whitespace-pre-line text-[32px] font-black leading-[0.98] tracking-[0.02em] sm:text-[46px] md:text-[58px]" style={{ color: 'var(--text)' }}>
          <GradientWord from="var(--accent-emerald-strong)" to="var(--accent-cyan)">{copy.title}</GradientWord>
        </h2>
        <p className="mx-auto max-w-xl text-sm leading-7 sm:text-base sm:leading-8" style={{ color: 'var(--muted)' }}>
          {copy.subtitle}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <GlassCard className="p-5" accentBorder="color-mix(in srgb, var(--accent-emerald) 24%, var(--border))">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-emerald-strong)' }}>{copy.matchupLabel}</span>
            <span className="landing-live-pulse rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: 'color-mix(in srgb, var(--accent-red) 16%, transparent)', color: 'var(--accent-red-strong)' }}>
              {copy.liveLabel}
            </span>
          </div>
          <div className="mb-1 flex items-center justify-between text-sm font-semibold" style={{ color: 'var(--text)' }}>
            <span>Dynasty Dragons</span>
            <span className="text-lg font-black" style={{ color: 'var(--accent-cyan-strong)' }}>78.4</span>
          </div>
          <div className="mb-4 flex items-center justify-between text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            <span>Gridiron Gang</span>
            <span className="text-lg font-black" style={{ color: 'var(--text)' }}>71.2</span>
          </div>
          <ProgressBar targetPct={72} accent="linear-gradient(90deg, var(--accent-emerald), var(--accent-cyan))" label={copy.winProbLabel} />
        </GlassCard>

        <GlassCard className="p-5" accentBorder="color-mix(in srgb, var(--border) 100%, transparent)">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)' }}>{copy.liveActivityLabel}</p>
          <ActivityTicker items={copy.tickerItems} />
        </GlassCard>
      </div>
    </section>
  )
}

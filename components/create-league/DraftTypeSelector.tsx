'use client'

import { useEffect, useRef, useState } from 'react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State } from '@/lib/create-league-v2/state'
import { getEffectiveLeagueType } from '@/lib/create-league-v2/state'
import {
  getDraftTypeOptions,
  isDraftTypeAllowedForType,
  isThirdRoundReversalAvailable,
} from '@/lib/create-league-v2/rules-engine'
import { GlassCard, SectionHeader, Segmented, Toggle } from '@/components/create-league-v2/primitives'

export function DraftTypeSelector({
  state,
  accent,
  onChange,
  onDraftSectionVisible,
  draftError,
}: {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
  onDraftSectionVisible?: (visible: boolean) => void
  draftError?: string
}) {
  const effectiveType = getEffectiveLeagueType(state)
  const draftSectionRef = useRef<HTMLDivElement | null>(null)
  const [draftInView, setDraftInView] = useState(false)

  const draftOptions = effectiveType ? getDraftTypeOptions(effectiveType, state.sport) : []
  const isSnake = state.draftType === 'snake'
  const unlocked = Boolean(effectiveType && state.name.trim().length >= 3)

  useEffect(() => {
    const el = draftSectionRef.current
    if (!el || !onDraftSectionVisible) return
    const io = new IntersectionObserver(
      ([e]) => {
        const v = (e?.intersectionRatio ?? 0) > 0.25
        setDraftInView(v)
        onDraftSectionVisible(v)
      },
      { threshold: [0, 0.15, 0.25, 0.5, 0.75] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [onDraftSectionVisible])

  return (
    <div ref={draftSectionRef}>
      <GlassCard className={!unlocked ? 'pointer-events-none opacity-40' : ''}>
        <SectionHeader
          title="4 · Draft type"
          hint="How picks are ordered — adjust timers and order in League Settings after creation."
        />
        <Segmented
          options={draftOptions.map((dt) => ({
            value: dt.id,
            label: dt.label,
            hint: dt.hint,
          }))}
          value={
            effectiveType && isDraftTypeAllowedForType(state.draftType, effectiveType)
              ? state.draftType
              : draftOptions[0]?.id ?? 'snake'
          }
          onChange={(draftType) => onChange({ draftType })}
          accent={accent}
          ariaLabel="Draft type"
        />
        {draftError ? (
          <p className="mt-2 text-xs text-rose-300/90" role="alert">
            {draftError}
          </p>
        ) : null}
        {isThirdRoundReversalAvailable(state.draftType) ? (
          <div className="mt-4">
            <Toggle
              checked={state.thirdRoundReversal && isSnake}
              onChange={(v) => onChange({ thirdRoundReversal: v })}
              label="Third Round Reversal"
              description="Snake reverses again in round 3 — optional twist for startups."
              accent={accent}
            />
          </div>
        ) : null}
        {draftInView ? (
          <p className="mt-3 text-[10px] text-white/30" aria-hidden>
            Draft preview media follows concept → draft → sport priority.
          </p>
        ) : null}
      </GlassCard>
    </div>
  )
}

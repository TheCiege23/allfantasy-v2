'use client'

/**
 * Page 3 — Scoring.
 *
 * Football sports show the full detail (superflex / TE premium / PPR),
 * everything else just confirms we'll use the selected preset and can be
 * customized after creation.
 */

import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State, PprMode } from '@/lib/create-league-v2/state'
import { isFootballLike } from '@/lib/create-league-v2/state'
import { GlassCard, PillRow, SectionHeader, Segmented, Toggle } from './primitives'

const PPR_OPTIONS: { value: PprMode; label: string; hint: string }[] = [
  { value: 'standard', label: 'Standard', hint: '0 pts / reception' },
  { value: 'half', label: 'Half PPR', hint: '0.5 pts / reception' },
  { value: 'full', label: 'Full PPR', hint: '1.0 pts / reception' },
]

const TE_MULTIPLIERS = [1.25, 1.5, 2] as const

export interface Page3ScoringProps {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
}

export function Page3Scoring({ state, accent, onChange }: Page3ScoringProps) {
  const football = isFootballLike(state.sport)

  if (!football) {
    return (
      <div className="space-y-4">
        <GlassCard>
          <SectionHeader
            title="Scoring"
            hint="Each sport ships with a tuned preset that you can customize after creation."
          />
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">
            <p className="font-semibold text-white">{state.sport} — preset scoring</p>
            <p className="mt-1 text-white/55">
              Your league will start with the <span className="text-white/80">AllFantasy default</span>{' '}
              preset for {state.sport}. All scoring values — category weights, bonuses, modifiers — are
              fully editable from the league settings screen after creation.
            </p>
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionHeader title="Reception Scoring" hint="How much each catch is worth." />
        <Segmented
          options={PPR_OPTIONS}
          value={state.pprMode}
          onChange={(pprMode) => onChange({ pprMode })}
          accent={accent}
          ariaLabel="PPR mode"
        />
      </GlassCard>

      <GlassCard>
        <SectionHeader
          title="Roster Twists"
          hint="Flip these on to shift value toward quarterbacks and tight ends."
        />
        <div className="space-y-3">
          <Toggle
            checked={state.superflex}
            onChange={(superflex) => onChange({ superflex })}
            label="Superflex"
            description="Adds a second QB-eligible slot — makes QBs dramatically more valuable."
            accent={accent}
          />
          <Toggle
            checked={state.tePremium}
            onChange={(tePremium) => onChange({ tePremium })}
            label="TE Premium"
            description="Tight ends earn a reception multiplier. Keeps the position relevant at the top of drafts."
            accent={accent}
          />
          {state.tePremium ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                TE Reception Multiplier
              </p>
              <PillRow
                options={TE_MULTIPLIERS}
                value={state.tePremiumMultiplier}
                onChange={(tePremiumMultiplier) => onChange({ tePremiumMultiplier })}
                accent={accent}
                ariaLabel="TE premium multiplier"
              />
              <p className="mt-2 text-[11px] text-white/40">
                At {state.tePremiumMultiplier}×, a TE catch is worth{' '}
                {(
                  (state.pprMode === 'full' ? 1 : state.pprMode === 'half' ? 0.5 : 0) *
                  state.tePremiumMultiplier
                ).toFixed(2)}{' '}
                points.
              </p>
            </div>
          ) : null}
        </div>
      </GlassCard>
    </div>
  )
}

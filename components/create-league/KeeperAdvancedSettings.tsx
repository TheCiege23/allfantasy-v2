'use client'

import type { AccentTone } from '@/lib/create-league-v2/theme'
import { getDefaultKeeperSetup, type CreateLeagueV2State, type KeeperSetupState } from '@/lib/create-league-v2/state'
import { GlassCard, SectionHeader, Toggle } from '@/components/create-league-v2/primitives'

type Props = {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
}

function numberValue(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function KeeperAdvancedSettings({ state, accent, onChange }: Props) {
  const k = state.keeper ?? getDefaultKeeperSetup()

  const updateKeeper = (patch: Partial<KeeperSetupState>) => {
    onChange({ keeper: { ...k, ...patch } })
  }

  return (
    <GlassCard>
      <SectionHeader
        title="Keeper policy"
        hint="Max keepers, carry costs, and eligibility rules are saved to the league and draft session at creation."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-white/70">
          <span>Max keepers per team</span>
          <input
            type="number"
            min={1}
            max={32}
            value={k.keeperMaxKeepers}
            onChange={(e) => updateKeeper({ keeperMaxKeepers: numberValue(e.target.value, k.keeperMaxKeepers) })}
            className="w-full rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="space-y-1 text-xs text-white/70">
          <span>Max years kept (same player)</span>
          <input
            type="number"
            min={0}
            max={20}
            value={k.keeperMaxYears}
            onChange={(e) => updateKeeper({ keeperMaxYears: numberValue(e.target.value, k.keeperMaxYears) })}
            className="w-full rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="space-y-1 text-xs text-white/70">
          <span>Snake round penalty (per year kept)</span>
          <input
            type="number"
            min={0}
            max={10}
            value={k.keeperRoundPenalty}
            onChange={(e) => updateKeeper({ keeperRoundPenalty: numberValue(e.target.value, k.keeperRoundPenalty) })}
            className="w-full rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="space-y-1 text-xs text-white/70">
          <span>Eligibility</span>
          <select
            value={k.keeperEligibilityRule}
            onChange={(e) =>
              updateKeeper({ keeperEligibilityRule: e.target.value as KeeperSetupState['keeperEligibilityRule'] })
            }
            className="w-full rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2 text-sm text-white"
          >
            <option value="any">Any rostered player</option>
            <option value="drafted_only">Drafted only</option>
            <option value="no_waivers">No waiver adds as keepers</option>
          </select>
        </label>

        <label className="space-y-1 text-xs text-white/70 sm:col-span-2">
          <span>Keeper intro video URL</span>
          <input
            value={k.introVideoUrl}
            onChange={(e) => updateKeeper({ introVideoUrl: e.target.value })}
            className="w-full rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="space-y-1 text-xs text-white/70 sm:col-span-2">
          <span>Keeper intro poster URL</span>
          <input
            value={k.introPosterUrl}
            onChange={(e) => updateKeeper({ introPosterUrl: e.target.value })}
            className="w-full rounded-xl border border-white/[0.1] bg-black/35 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <div className="mt-5">
        <Toggle
          checked={k.keeperWaiverAllowed}
          onChange={(v) => updateKeeper({ keeperWaiverAllowed: v })}
          label="Allow waiver pickups as keepers"
          description="When off, policy may restrict keepers to players acquired before waivers (see eligibility)."
          accent={accent}
        />
      </div>
    </GlassCard>
  )
}

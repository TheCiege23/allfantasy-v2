'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { isKeeperLeagueType, isDevyLeagueType, isC2CLeagueType } from '@/lib/league-creation-wizard/league-type-registry'
import type { LeagueCreationWizardState, WizardDraftSettings } from '@/lib/league-creation-wizard/types'

const ROUNDS = [10, 12, 15, 18, 20, 22, 25, 30] as const
const TIMER_OPTS = [60, 90, 120, 180, 300, 0] as const

export type Step6DraftSettingsProps = {
  state: LeagueCreationWizardState
  onDraftSettingsChange: (patch: Partial<WizardDraftSettings>) => void
  onBack: () => void
  onNext: () => void
}

export function Step6DraftSettings({ state, onDraftSettingsChange, onBack, onNext }: Step6DraftSettingsProps) {
  const d = state.draftSettings
  const isAuction = state.draftType === 'auction'
  const showKeeper = isKeeperLeagueType(state.leagueType)
  const showDevy = isDevyLeagueType(state.leagueType)
  const showC2C = isC2CLeagueType(state.leagueType)
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Draft settings</h2>
      <p className="text-sm text-white/70">Rounds, timer, and variant options. Applied when you start the draft.</p>
      <div>
        <Label className="text-white/90">Rounds</Label>
        <Select
          value={String(d.rounds)}
          onValueChange={(v) => onDraftSettingsChange({ rounds: Number(v) })}
        >
          <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROUNDS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-white/90">Timer per pick (seconds, 0 = none)</Label>
        <Select
          value={d.timerSeconds != null ? String(d.timerSeconds) : '90'}
          onValueChange={(v) => onDraftSettingsChange({ timerSeconds: v === '0' ? 0 : Number(v) })}
        >
          <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMER_OPTS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n === 0 ? 'No timer' : `${n}s`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isAuction && (
        <div>
          <Label className="text-white/90">Auction budget per team</Label>
          <Select
            value={String(d.auctionBudgetPerTeam ?? 200)}
            onValueChange={(v) => onDraftSettingsChange({ auctionBudgetPerTeam: Number(v) })}
          >
            <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[100, 200, 250, 300].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  ${n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {showKeeper && (
        <div>
          <Label className="text-white/90">Max keepers</Label>
          <Select
            value={String(d.keeperMaxKeepers ?? 3)}
            onValueChange={(v) => onDraftSettingsChange({ keeperMaxKeepers: Number(v) })}
          >
            <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex justify-between gap-2">
        <button type="button" onClick={onBack} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/90 hover:bg-white/10 min-h-[44px] touch-manipulation">
          Back
        </button>
        <button type="button" onClick={onNext} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 min-h-[44px] touch-manipulation">
          Next
        </button>
      </div>
    </section>
  )
}

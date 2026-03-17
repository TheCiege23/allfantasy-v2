'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useSportRules } from '@/hooks/useSportRules'
import type { LeagueCreationWizardState } from '@/lib/league-creation-wizard/types'

const TEAM_COUNTS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24] as const

export type Step4TeamSetupProps = {
  state: LeagueCreationWizardState
  onTeamCountChange: (n: number) => void
  onRosterSizeChange: (n: number | null) => void
  onNameChange: (name: string) => void
  onBack: () => void
  onNext: () => void
}

export function Step4TeamSetup({
  state,
  onTeamCountChange,
  onRosterSizeChange,
  onNameChange,
  onBack,
  onNext,
}: Step4TeamSetupProps) {
  const { rules } = useSportRules(state.sport, state.leagueVariant ?? undefined)
  const teamCount = state.teamCount >= 4 && state.teamCount <= 24 ? state.teamCount : 12
  const defaultRosterSlots = rules?.roster.slots
    .filter((s) => s.starterCount > 0 || s.slotName === 'BENCH' || s.slotName === 'IR')
    .map((s) => (s.starterCount > 0 ? (s.starterCount > 1 ? `${s.slotName}×${s.starterCount}` : s.slotName) : s.slotName))
    .join(', ') ?? ''
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Team setup</h2>
      <p className="text-sm text-white/70">League size and optional roster size. Name your league.</p>
      {defaultRosterSlots && (
        <p className="text-xs text-white/50" data-sport-rules-roster>
          Default roster for {state.sport}: {defaultRosterSlots}
        </p>
      )}
      <div>
        <Label className="text-white/90">League name</Label>
        <Input
          value={state.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="My League"
          className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]"
        />
      </div>
      <div>
        <Label className="text-white/90">Number of teams</Label>
        <Select
          value={String(teamCount)}
          onValueChange={(v) => onTeamCountChange(Number(v))}
        >
          <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEAM_COUNTS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} teams
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-white/90">Roster size (optional)</Label>
        <Select
          value={state.rosterSize != null ? String(state.rosterSize) : 'default'}
          onValueChange={(v) => onRosterSizeChange(v === 'default' ? null : Number(v))}
        >
          <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Use sport default</SelectItem>
            {[10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} players
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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

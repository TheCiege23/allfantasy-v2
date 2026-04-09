'use client'

import { Input } from '@/components/ui/input'
import { LeagueCreateStepProps } from '../types'

const ENDGAME_MODES = [
  { value: 'last_team_standing', label: 'Last Team Standing' },
  { value: 'final_four', label: 'Final Four' },
  { value: 'final_three', label: 'Final 3' },
  { value: 'final_two', label: 'Final 2 Showdown' },
] as const

const TIEBREAKERS = [
  { value: 'lowest_bench_points', label: 'Lowest Bench' },
  { value: 'lowest_cumulative', label: 'Lowest Season Total' },
  { value: 'lowest_projected', label: 'Lowest Projected' },
  { value: 'commissioner', label: 'Commissioner Decides' },
] as const

const WAIVER_MODES = [
  { value: 'faab', label: 'FAAB Bidding' },
  { value: 'rolling', label: 'Rolling Priority' },
  { value: 'reverse', label: 'Reverse Order' },
] as const

export function GuillotineSetupStep({ state, setState }: LeagueCreateStepProps) {
  const gs = (state as any)

  return (
    <div className="space-y-5">
      {/* Elimination Rules */}
      <div>
        <div className="mb-3 text-sm font-medium text-white/80">Elimination Rules</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-white/60">Eliminations Per Period</label>
            <Input
              type="number" min={1} max={3}
              value={gs.guillotineEliminationsPerPeriod ?? 1}
              onChange={(e) => setState((c: any) => ({ ...c, guillotineEliminationsPerPeriod: Number(e.target.value) || 1 }))}
            />
            <div className="mt-1 text-xs text-white/40">How many teams get chopped each scoring period</div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-white/60">Protected Opening Week</label>
            <div className="flex items-center gap-3 mt-2">
              <label className="flex items-center gap-2 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={gs.guillotineProtectedWeek1 ?? false}
                  onChange={(e) => setState((c: any) => ({ ...c, guillotineProtectedWeek1: e.target.checked }))}
                  className="rounded border-white/20"
                />
                No elimination in Week 1
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Endgame Format */}
      <div>
        <label className="mb-2 block text-xs font-medium text-white/60">Endgame Format</label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {ENDGAME_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setState((c: any) => ({ ...c, guillotineEndgame: mode.value }))}
              className={`rounded-2xl border px-4 py-3 text-sm transition ${
                (gs.guillotineEndgame ?? 'last_team_standing') === mode.value
                  ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tiebreaker */}
      <div>
        <label className="mb-2 block text-xs font-medium text-white/60">Elimination Tiebreaker</label>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {TIEBREAKERS.map((tb) => (
            <button
              key={tb.value}
              type="button"
              onClick={() => setState((c: any) => ({ ...c, guillotineTiebreaker: tb.value }))}
              className={`rounded-2xl border px-4 py-3 text-sm transition ${
                (gs.guillotineTiebreaker ?? 'lowest_bench_points') === tb.value
                  ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Waiver System */}
      <div>
        <label className="mb-2 block text-xs font-medium text-white/60">Waiver System</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {WAIVER_MODES.map((wm) => (
            <button
              key={wm.value}
              type="button"
              onClick={() => setState((c: any) => ({ ...c, guillotineWaiverMode: wm.value }))}
              className={`rounded-2xl border px-4 py-3 text-sm transition ${
                (gs.guillotineWaiverMode ?? 'faab') === wm.value
                  ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20'
              }`}
            >
              {wm.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div>
        <div className="mb-3 text-sm font-medium text-white/80">Advanced</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-white/60">FAAB Budget</label>
            <Input
              type="number" min={0} max={1000}
              value={gs.guillotineFaabBudget ?? 100}
              onChange={(e) => setState((c: any) => ({ ...c, guillotineFaabBudget: Number(e.target.value) || 100 }))}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-white/75 mt-6">
              <input
                type="checkbox"
                checked={gs.guillotineSamePeriodPickups ?? false}
                onChange={(e) => setState((c: any) => ({ ...c, guillotineSamePeriodPickups: e.target.checked }))}
                className="rounded border-white/20"
              />
              Allow same-period pickups of eliminated players
            </label>
          </div>
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm text-white/75">
            <input
              type="checkbox"
              checked={gs.guillotineTradesEnabled ?? false}
              onChange={(e) => setState((c: any) => ({ ...c, guillotineTradesEnabled: e.target.checked }))}
              className="rounded border-white/20"
            />
            Enable trades (OFF by default for guillotine)
          </label>
        </div>
      </div>
    </div>
  )
}

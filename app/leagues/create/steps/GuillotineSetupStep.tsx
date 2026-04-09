'use client'

import { Input } from '@/components/ui/input'
import { LeagueCreateStepProps } from '../types'

const SPORT_SCHEDULE_INFO: Record<string, { weeks: number; defaultTeams: number; chopDay: string; waiverDay: string; gamePattern: string }> = {
  NFL: { weeks: 18, defaultTeams: 17, chopDay: 'Tuesday', waiverDay: 'Wednesday', gamePattern: '1 game/team/week (Thu/Sun/Mon)' },
  NBA: { weeks: 24, defaultTeams: 23, chopDay: 'Monday', waiverDay: 'Tuesday', gamePattern: '3-5 games/team/week (daily)' },
  MLB: { weeks: 26, defaultTeams: 25, chopDay: 'Monday', waiverDay: 'Tuesday', gamePattern: '6-7 games/team/week (daily)' },
  NHL: { weeks: 24, defaultTeams: 23, chopDay: 'Monday', waiverDay: 'Tuesday', gamePattern: '3-4 games/team/week (daily)' },
  NCAAF: { weeks: 14, defaultTeams: 13, chopDay: 'Sunday', waiverDay: 'Monday', gamePattern: '1 game/team/week (mostly Saturday)' },
  NCAAB: { weeks: 20, defaultTeams: 19, chopDay: 'Monday', waiverDay: 'Tuesday', gamePattern: '2-3 games/team/week' },
  SOCCER: { weeks: 38, defaultTeams: 20, chopDay: 'Tuesday', waiverDay: 'Wednesday', gamePattern: '1 match/team/matchweek (Sat/Sun)' },
}

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
  const sportInfo = SPORT_SCHEDULE_INFO[state.sport] ?? SPORT_SCHEDULE_INFO.NFL!

  return (
    <div className="space-y-5">
      {/* Sport Schedule Info */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-red-300/60 mb-1">Schedule for {state.sport}</div>
        <div className="grid gap-2 sm:grid-cols-2 text-xs text-white/60">
          <div>Regular season: <span className="text-white/80">{sportInfo.weeks} weeks</span></div>
          <div>Game pattern: <span className="text-white/80">{sportInfo.gamePattern}</span></div>
          <div>Default teams: <span className="text-white font-bold">{sportInfo.defaultTeams}</span> <span className="text-white/40">({sportInfo.weeks} weeks - 1)</span></div>
          <div>Chop day: <span className="text-red-300/80">{sportInfo.chopDay}</span> · Waivers: <span className="text-emerald-300/80">{sportInfo.waiverDay}</span></div>
        </div>
        <div className="mt-2 text-[11px] text-white/40">
          1 team is eliminated every {sportInfo.chopDay}. Waivers run every {sportInfo.waiverDay} — eliminated roster enters the player pool.
          {sportInfo.gamePattern.includes('daily') && ' Some games may still be in progress on waiver day — waivers run regardless.'}
        </div>
      </div>

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

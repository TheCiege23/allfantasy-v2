'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LeagueCreateStepProps } from '../types'

const TRADE_REVIEW_MODES = ['none', 'commissioner', 'league_vote', 'instant'] as const

export function RulesStep({ state, setState }: LeagueCreateStepProps) {
  const isSurvivor = state.formatId === 'survivor'
  const isZombie = state.formatId === 'zombie'

  return (
    <div className="space-y-4">
      {isSurvivor && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/15 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-100">Survivor league</h3>
          <p className="mb-4 text-xs text-white/55">
            2–4 tribes, optional season headline, and system-run challenges (recommended when the commissioner plays). Exile
            Island is linked automatically; post the FAQ from Survivor settings once league chat is connected.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-white/60">Tribe count</Label>
              <select
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
                value={String(Math.min(4, Math.max(2, state.survivorTribeCount)))}
                onChange={(e) =>
                  setState((c) => ({
                    ...c,
                    survivorTribeCount: Math.min(4, Math.max(2, Number(e.target.value))),
                  }))
                }
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} tribes
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-white/60">Season headline (optional)</Label>
              <Input
                className="mt-1 bg-white/[0.06] border-white/10"
                placeholder="e.g. Heroes vs Villains"
                value={state.survivorSeasonTheme}
                onChange={(e) => setState((c) => ({ ...c, survivorSeasonTheme: e.target.value }))}
                data-testid="create-survivor-theme"
              />
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              className="rounded border-white/20"
              checked={state.survivorChallengesSystemRun}
              onChange={(e) => setState((c) => ({ ...c, survivorChallengesSystemRun: e.target.checked }))}
            />
            System-run weekly challenges (catalog-generated)
          </label>
        </div>
      )}

      {isZombie && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-4">
          <h3 className="mb-2 text-sm font-semibold text-emerald-100">Zombie league</h3>
          <p className="mb-4 text-xs text-white/55">
            Pick how the Whisperer is assigned at startup; you can refine infection, serum, and weapons in commissioner
            settings after the league is created.
          </p>
          <Label className="text-white/60">Whisperer selection</Label>
          <select
            className="mt-1 w-full max-w-md rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
            value={state.zombieWhispererSelection}
            onChange={(e) =>
              setState((c) => ({
                ...c,
                zombieWhispererSelection: e.target.value === 'veteran_priority' ? 'veteran_priority' : 'random',
              }))
            }
            data-testid="create-zombie-whisperer"
          >
            <option value="random">Random</option>
            <option value="veteran_priority">Veteran priority</option>
          </select>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Playoff Teams</label>
          <Input
            type="number"
            min={2}
            value={state.playoffTeamCount}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                playoffTeamCount: Number(event.target.value || current.playoffTeamCount),
              }))
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Regular Season Length</label>
          <Input
            type="number"
            min={1}
            value={state.regularSeasonLength}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                regularSeasonLength: Number(event.target.value || current.regularSeasonLength),
              }))
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Max Keepers</label>
          <Input
            type="number"
            min={0}
            value={state.maxKeepers}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                maxKeepers: Number(event.target.value || current.maxKeepers),
              }))
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Salary Cap</label>
          <Input
            type="number"
            min={0}
            value={state.salaryCap}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                salaryCap: Number(event.target.value || current.salaryCap),
              }))
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TRADE_REVIEW_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() =>
              setState((current) => ({
                ...current,
                tradeReviewMode: mode,
              }))
            }
            className={`rounded-2xl border px-4 py-3 text-sm transition ${
              state.tradeReviewMode === mode
                ? 'border-cyan-300/60 bg-cyan-300/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20'
            }`}
          >
            {mode.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-white/60">League Constitution Notes</label>
        <Textarea
          value={state.constitutionNotes}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              constitutionNotes: event.target.value,
            }))
          }
          placeholder="Optional commissioner notes for the generated constitution and onboarding copy."
          className="min-h-[120px]"
        />
      </div>
    </div>
  )
}

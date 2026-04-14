'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'
import {
  DEFAULT_WIZARD_FORMAT_OPTIONS,
  type WizardFormatOptions,
  clampSurvivorTeamCount,
} from '@/lib/league-creation-wizard/wizard-format-options'
import { TOURNAMENT_PARTICIPANT_POOL_SIZES_EXTENDED } from '@/lib/tournament-mode/pool-sizes'
import { FEEDER_LEAGUES_BY_POOL, TOURNAMENT_TEAMS_PER_LEAGUE } from '@/lib/tournament-mode/tournament-sport-cutoffs'
import { StepHeader } from './StepHelp'

const CHECKBOX_CLASS = 'mt-0.5 shrink-0 size-5 rounded border border-white/30 bg-[#020817] accent-cyan-400'

function survivorSeasonPhrase(sport: string): string {
  const u = sport.toUpperCase()
  if (u === 'NFL' || u === 'NCAAF') return 'football season'
  if (u === 'NBA' || u === 'NCAAB') return 'basketball season'
  if (u === 'NHL') return 'hockey season'
  if (u === 'MLB') return 'baseball season'
  if (u === 'SOCCER') return 'soccer season'
  return 'season'
}

function sportBrandLabel(sport: string): string {
  const u = sport.toUpperCase()
  const map: Record<string, string> = {
    NFL: 'NFL',
    NBA: 'NBA',
    NHL: 'NHL',
    MLB: 'MLB',
    NCAAF: 'NCAA Football',
    NCAAB: 'NCAA Basketball',
    SOCCER: 'Soccer',
  }
  return map[u] ?? u
}

export type LeagueFormatOptionsPanelProps = {
  sport: string
  leagueType: LeagueTypeId
  value: WizardFormatOptions
  onChange: (patch: Partial<WizardFormatOptions>) => void
}

/**
 * League-type-specific questions during create. Fine-grained rules remain in League settings post-create.
 */
export function LeagueFormatOptionsPanel({ sport, leagueType, value, onChange }: LeagueFormatOptionsPanelProps) {
  const v = { ...DEFAULT_WIZARD_FORMAT_OPTIONS, ...value }
  const survivorCast = clampSurvivorTeamCount(sport, v.survivorTeamCount)
  const tribePick = (v.survivorTribeCountOverride ?? 4) as 2 | 3 | 4
  const tribeNameLines =
    v.survivorTribeNameMode === 'custom'
      ? Array.from({ length: tribePick }, (_, i) => v.survivorCustomTribeNamesLines.split('\n')[i] ?? '')
      : []

  const isNfl = sport.toUpperCase() === 'NFL'
  const idpActive = isNfl && v.idpEnabled

  if ((leagueType === 'redraft' || leagueType === 'best_ball') && !idpActive) {
    return null
  }

  return (
    <div className="space-y-6 border-t border-white/10 pt-6 mt-2">
      <StepHeader
        title="Format-specific setup"
        description="These choices seed your league. Everything here can be refined later in League settings."
        helpTitle="Why we ask"
        help={<>Specialty formats need a few extra inputs so defaults, hubs, and social layers match your concept.</>}
      />

      {leagueType === 'tournament' && (
        <div className="space-y-4 rounded-2xl border border-purple-500/25 bg-purple-950/20 p-4">
          <h4 className="text-sm font-semibold text-purple-100">Tournament hub</h4>
          <p className="text-xs text-white/55">
            Choose how many managers join the tournament. Each feeder league is exactly{' '}
            <span className="text-white/80">{TOURNAMENT_TEAMS_PER_LEAGUE} teams</span> (12 managers). The pool size
            determines how many feeder leagues we create (6, 12, or 18).
          </p>
          <div className="space-y-1.5">
            <Label className="text-white/85">Participant pool</Label>
            <Select
              value={String(v.tournamentParticipantPoolSize)}
              onValueChange={(x) => {
                const pool = Number(x)
                onChange({
                  tournamentParticipantPoolSize: pool,
                  tournamentInitialLeagueSize: 12,
                })
              }}
            >
              <SelectTrigger className="border-white/20 bg-[#030a20] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOURNAMENT_PARTICIPANT_POOL_SIZES_EXTENDED.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} managers → {FEEDER_LEAGUES_BY_POOL[n as keyof typeof FEEDER_LEAGUES_BY_POOL]} leagues ×{' '}
                    {TOURNAMENT_TEAMS_PER_LEAGUE} teams
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-white/45">
            Conference naming (Black/Gold, themed, or custom) is a cosmetic suggestion for labels — it does not block
            creation.
          </p>
          <div className="space-y-1.5">
            <Label className="text-white/85">Feeder league size</Label>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/80">
              Fixed at {TOURNAMENT_TEAMS_PER_LEAGUE} managers per feeder league
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/85">Feeder league names</Label>
            <Select
              value={v.tournamentLeagueNamingMode}
              onValueChange={(x) => onChange({ tournamentLeagueNamingMode: x as WizardFormatOptions['tournamentLeagueNamingMode'] })}
            >
              <SelectTrigger className="border-white/20 bg-[#030a20] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="app_generated">App-generated names</SelectItem>
                <SelectItem value="ai_themed">AI-themed names</SelectItem>
                <SelectItem value="commissioner_custom">I will name each league (one per line below)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {v.tournamentLeagueNamingMode === 'commissioner_custom' && (
            <div className="space-y-1.5">
              <Label className="text-white/85">Custom league names (one per line)</Label>
              <textarea
                value={v.tournamentCustomLeagueNamesLines}
                onChange={(e) => onChange({ tournamentCustomLeagueNamesLines: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
                placeholder="Black BEAST&#10;Gold GOAT&#10;..."
              />
            </div>
          )}
        </div>
      )}

      {leagueType === 'survivor' && (
        <div className="space-y-4 rounded-2xl border border-amber-500/25 bg-amber-950/15 p-4">
          <h4 className="text-sm font-semibold text-amber-100">
            Survivor ({sportBrandLabel(sport)})
          </h4>
          <p className="text-xs text-white/55">
            Cast size ({survivorCast} managers) was set on the previous step. Tribes split your{' '}
            {sportBrandLabel(sport)} {survivorSeasonPhrase(sport)} into phases; you can name tribes below or let the
            app label them. Exile Island is provisioned after create.
          </p>
          <div className="space-y-1.5">
            <Label className="text-white/85">Number of tribes</Label>
            <Select
              value={String(tribePick)}
              onValueChange={(x) => {
                const n = Math.min(4, Math.max(2, Number(x))) as 2 | 3 | 4
                const prevLines = v.survivorCustomTribeNamesLines.split('\n')
                const nextLines = prevLines.slice(0, n)
                while (nextLines.length < n) nextLines.push('')
                onChange({
                  survivorTribeCountOverride: n,
                  survivorCustomTribeNamesLines: nextLines.join('\n'),
                })
              }}
            >
              <SelectTrigger
                className="border-white/20 bg-[#030a20] text-white"
                data-testid="wizard-survivor-tribe-count"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 tribes</SelectItem>
                <SelectItem value="3">3 tribes</SelectItem>
                <SelectItem value="4">4 tribes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/45">Defaults to 4 tribes. Matches your survivor structure at creation.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/85">Tribe names</Label>
            <Select
              value={v.survivorTribeNameMode}
              onValueChange={(x) => onChange({ survivorTribeNameMode: x as WizardFormatOptions['survivorTribeNameMode'] })}
            >
              <SelectTrigger className="border-white/20 bg-[#030a20] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-generate tribe names</SelectItem>
                <SelectItem value="custom">I will name each tribe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {v.survivorTribeNameMode === 'custom' && (
            <div className="space-y-2" data-testid="wizard-survivor-tribe-names">
              <p className="text-[11px] text-white/45">
                One name per tribe ({tribePick} fields). Emojis are OK.
              </p>
              <div className="flex flex-col gap-2">
                {tribeNameLines.map((line, i) => (
                  <Input
                    key={i}
                    value={line}
                    onChange={(e) => {
                      const next = [...tribeNameLines]
                      next[i] = e.target.value
                      onChange({ survivorCustomTribeNamesLines: next.join('\n') })
                    }}
                    placeholder={`Tribe ${i + 1}`}
                    className="border-white/20 bg-[#030a20] text-white"
                    data-testid={`wizard-survivor-tribe-name-${i}`}
                    autoComplete="off"
                  />
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-white/85">Your role</Label>
            <Select
              value={v.survivorCommissionerRole}
              onValueChange={(x) =>
                onChange({ survivorCommissionerRole: x as WizardFormatOptions['survivorCommissionerRole'] })
              }
            >
              <SelectTrigger className="border-white/20 bg-[#030a20] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commissioner_only">Commissioner only (full visibility)</SelectItem>
                <SelectItem value="player_commissioner">
                  Player + commissioner (limited draft / edge visibility for fair play)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/85">Season headline (optional)</Label>
            <Input
              value={v.survivorSeasonThemeLabel}
              onChange={(e) => onChange({ survivorSeasonThemeLabel: e.target.value })}
              placeholder="e.g. Heroes vs Villains"
              className="border-white/20 bg-[#030a20] text-white"
              data-testid="wizard-survivor-season-theme"
            />
          </div>
          <label
            className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
              v.survivorChallengesSystemRun
                ? 'border-cyan-400/35 bg-cyan-500/10 text-white'
                : 'border-white/12 bg-black/25 text-white/85 hover:bg-black/35'
            }`}
          >
            <input
              type="checkbox"
              checked={v.survivorChallengesSystemRun}
              onChange={(e) => onChange({ survivorChallengesSystemRun: e.target.checked })}
              className={CHECKBOX_CLASS}
            />
            System-run weekly challenges (recommended; reduces collusion if you play)
          </label>
        </div>
      )}

      {leagueType === 'keeper' && (
        <div className="space-y-3 rounded-2xl border border-cyan-500/20 bg-[#050f29]/80 p-4">
          <Label className="text-white/85">Keepers per season</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={v.keeperMaxKeepers}
            onChange={(e) => onChange({ keeperMaxKeepers: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
            className="border-white/20 bg-[#030a20] text-white"
          />
        </div>
      )}

      {leagueType === 'zombie' && (
        <div className="space-y-3 rounded-2xl border border-lime-500/25 bg-lime-950/10 p-4">
          <div className="space-y-1.5">
            <Label className="text-white/85">Whisperer selection</Label>
            <Select
              value={v.zombieWhispererSelection}
              onValueChange={(x) =>
                onChange({
                  zombieWhispererSelection: x === 'veteran_priority' ? 'veteran_priority' : 'random',
                })
              }
            >
              <SelectTrigger className="border-white/20 bg-[#030a20] text-white" data-testid="wizard-zombie-whisperer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="veteran_priority">Veteran priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Label
            htmlFor="zombie-universe-mode"
            className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-white/85 transition ${
              v.zombieUniverseMode
                ? 'border-cyan-400/35 bg-cyan-500/10 text-white'
                : 'border-white/12 bg-black/25 hover:bg-black/35'
            }`}
          >
            <input
              id="zombie-universe-mode"
              type="checkbox"
              checked={v.zombieUniverseMode}
              onChange={(e) => onChange({ zombieUniverseMode: e.target.checked })}
              className={CHECKBOX_CLASS}
              aria-label="Create a Zombie universe"
            />
            Create a Zombie universe (inter-linked leagues)
          </Label>
          {v.zombieUniverseMode && (
            <div className="space-y-1.5">
              <Label className="text-white/85">Linked leagues in universe (1–8)</Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={v.zombieIntertwinedLeagueCount}
                onChange={(e) =>
                  onChange({
                    zombieIntertwinedLeagueCount: Math.max(1, Math.min(8, Number(e.target.value) || 1)),
                  })
                }
                className="border-white/20 bg-[#030a20] text-white"
              />
            </div>
          )}
        </div>
      )}

      {leagueType === 'salary_cap' && (
        <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-4">
          <div className="space-y-1.5">
            <Label className="text-white/85">Salary cap mode</Label>
            <Select
              value={v.salaryCapMode}
              onValueChange={(x) => onChange({ salaryCapMode: x as WizardFormatOptions['salaryCapMode'] })}
            >
              <SelectTrigger className="border-white/20 bg-[#030a20] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dynasty">Dynasty salary cap</SelectItem>
                <SelectItem value="bestball">Best ball salary cap</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/85">Startup cap (optional)</Label>
            <Input
              type="number"
              value={v.salaryCapStartupCap ?? ''}
              placeholder="Use sport default"
              onChange={(e) =>
                onChange({
                  salaryCapStartupCap: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="border-white/20 bg-[#030a20] text-white"
            />
          </div>
        </div>
      )}

      {leagueType === 'guillotine' && (
        <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-950/15 p-4">
          <p className="text-xs text-white/65">
            Guillotine: lowest scorers are eliminated each period until one team remains. Chop timing and correction
            windows are tuned after create.
          </p>
          <label
            className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
              v.guillotineRulesAcknowledged
                ? 'border-cyan-400/35 bg-cyan-500/10 text-white'
                : 'border-white/12 bg-black/25 text-white/85 hover:bg-black/35'
            }`}
          >
            <input
              type="checkbox"
              checked={v.guillotineRulesAcknowledged}
              onChange={(e) => onChange({ guillotineRulesAcknowledged: e.target.checked })}
              className={CHECKBOX_CLASS}
            />
            I understand eliminations run on scoring periods and can be adjusted in settings.
          </label>
        </div>
      )}

      {leagueType === 'big_brother' && (
        <div className="space-y-4 rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-950/15 to-purple-950/10 p-4">
          <div className="flex items-center gap-3 border-b border-cyan-500/15 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-base">
              <span role="img" aria-label="eye">&#128065;</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-cyan-200">Big Brother Settings</p>
              <p className="text-[11px] text-white/50">HOH / Nominations / Veto / Eviction / Jury</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white/85">League subtitle (optional)</Label>
            <Input
              value={v.bigBrotherSubtitle}
              onChange={(e) => onChange({ bigBrotherSubtitle: e.target.value })}
              placeholder="e.g. Season 1 — AllFantasy"
              className="border-white/20 bg-[#030a20] text-white"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-white/75 text-[12px]">Finale format</Label>
              <select
                value={v.bigBrotherFinaleFormat ?? 'final_2'}
                onChange={(e) => onChange({ bigBrotherFinaleFormat: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white"
                aria-label="Finale format"
              >
                <option value="final_2">Final 2 (classic)</option>
                <option value="final_3">Final 3</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/75 text-[12px]">Jury start mode</Label>
              <select
                value={v.bigBrotherJuryMode ?? 'after_eliminations'}
                onChange={(e) => onChange({ bigBrotherJuryMode: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white"
                aria-label="Jury start mode"
              >
                <option value="after_eliminations">After N evictions (default 7)</option>
                <option value="when_remaining">When X houseguests remain</option>
                <option value="fixed_week">Fixed week number</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-white/75 text-[12px]">HOH challenge mode</Label>
              <select
                value={v.bigBrotherChallengeMode ?? 'deterministic_score'}
                onChange={(e) => onChange({ bigBrotherChallengeMode: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white"
                aria-label="HOH challenge mode"
              >
                <option value="deterministic_score">Fantasy score (highest weekly score wins)</option>
                <option value="hybrid">Hybrid (score + challenge factor)</option>
                <option value="ai_theme">AI-themed challenges</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/75 text-[12px]">Eviction tie-break</Label>
              <select
                value={v.bigBrotherTieBreak ?? 'hoh_vote'}
                onChange={(e) => onChange({ bigBrotherTieBreak: e.target.value })}
                className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white"
                aria-label="Eviction tie-break"
              >
                <option value="hoh_vote">HOH breaks the tie</option>
                <option value="season_points">Season points (lowest evicted)</option>
                <option value="random">Random (seeded)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="bb-consecutive-hoh"
              checked={v.bigBrotherConsecutiveHoh ?? false}
              onChange={(e) => onChange({ bigBrotherConsecutiveHoh: e.target.checked })}
              className={CHECKBOX_CLASS}
            />
            <label htmlFor="bb-consecutive-hoh" className="text-[12px] text-white/70">
              Allow consecutive HOH wins (default: off — previous HOH cannot compete next week)
            </label>
          </div>

          <div className="rounded-lg border border-cyan-500/10 bg-cyan-950/20 p-3 text-[11px] text-white/50">
            All game settings (deadlines, veto player count, waiver release timing, anti-collusion logging) can be fine-tuned
            after league creation in the commissioner settings panel.
          </div>
        </div>
      )}

      {leagueType === 'dynasty' && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
          <Label className="text-white/85">Taxi squad spots (dynasty)</Label>
          <Input
            type="number"
            min={0}
            max={10}
            value={v.dynastyTaxiSlots}
            onChange={(e) => onChange({ dynastyTaxiSlots: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
            className="border-white/20 bg-[#030a20] text-white"
          />
        </div>
      )}

      {leagueType === 'devy' && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="space-y-1.5">
            <Label className="text-white/85">Taxi spots</Label>
            <Input
              type="number"
              min={0}
              max={12}
              value={v.devyTaxiSlots}
              onChange={(e) => onChange({ devyTaxiSlots: Math.max(0, Math.min(12, Number(e.target.value) || 0)) })}
              className="border-white/20 bg-[#030a20] text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/85">College / devy reserve slots</Label>
            <Input
              type="number"
              min={0}
              max={12}
              value={v.devyCollegeSlots}
              onChange={(e) => onChange({ devyCollegeSlots: Math.max(0, Math.min(12, Number(e.target.value) || 0)) })}
              className="border-white/20 bg-[#030a20] text-white"
            />
          </div>
        </div>
      )}

      {leagueType === 'c2c' && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="space-y-1.5">
            <Label className="text-white/85">Taxi spots</Label>
            <Input
              type="number"
              min={0}
              max={12}
              value={v.c2cTaxiSlots}
              onChange={(e) => onChange({ c2cTaxiSlots: Math.max(0, Math.min(12, Number(e.target.value) || 0)) })}
              className="border-white/20 bg-[#030a20] text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/85">College roster emphasis (slots)</Label>
            <Input
              type="number"
              min={0}
              max={20}
              value={v.c2cCollegeSlots}
              onChange={(e) => onChange({ c2cCollegeSlots: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })}
              className="border-white/20 bg-[#030a20] text-white"
            />
          </div>
        </div>
      )}

      {/* IDP modifier settings — NFL only */}
      {isNfl && (
        <div className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-950/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-xs font-bold text-emerald-400">
              IDP
            </div>
            <div>
              <p className="text-[13px] font-bold text-emerald-200">Individual Defensive Players</p>
              <p className="text-[11px] text-white/50">Roster real defenders — DL, LB, DB — alongside your offense</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="idp-enabled"
              checked={v.idpEnabled}
              onChange={(e) => onChange({ idpEnabled: e.target.checked })}
              className={CHECKBOX_CLASS}
            />
            <label htmlFor="idp-enabled" className="text-sm text-white/80">Enable IDP roster slots</label>
          </div>

          {v.idpEnabled && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-white/75 text-[12px]">Position mode</Label>
                <select
                  value={v.idpPositionMode}
                  onChange={(e) => onChange({ idpPositionMode: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white"
                  aria-label="IDP position mode"
                >
                  <option value="standard">Standard (DL / LB / DB)</option>
                  <option value="advanced">Advanced (DE / DT / LB / CB / S)</option>
                  <option value="hybrid">Hybrid (both)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/75 text-[12px]">Roster preset</Label>
                <select
                  value={v.idpRosterPreset}
                  onChange={(e) => onChange({ idpRosterPreset: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white"
                  aria-label="IDP roster preset"
                >
                  <option value="beginner">Beginner (1 DL, 2 LB, 2 DB, 1 FLEX)</option>
                  <option value="standard">Standard (2 DL, 2 LB, 2 DB, 2 FLEX)</option>
                  <option value="advanced">Advanced (2 DE, 1 DT, 3 LB, 2 CB, 2 S, 1 FLEX)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/75 text-[12px]">Scoring style</Label>
                <select
                  value={v.idpScoringPreset}
                  onChange={(e) => onChange({ idpScoringPreset: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#030a20] px-3 py-2 text-sm text-white"
                  aria-label="IDP scoring style"
                >
                  <option value="balanced">Balanced</option>
                  <option value="tackle_heavy">Tackle-heavy</option>
                  <option value="big_play_heavy">Big-play-heavy</option>
                </select>
              </div>
            </div>
          )}

          {v.idpEnabled && (
            <div className="rounded-lg border border-emerald-500/10 bg-emerald-950/20 p-3 text-[11px] text-white/50">
              IDP slots will be added to your standard offensive roster. Scoring overrides and custom slot counts can be fine-tuned in league settings after creation.
            </div>
          )}
        </div>
      )}

    </div>
  )
}

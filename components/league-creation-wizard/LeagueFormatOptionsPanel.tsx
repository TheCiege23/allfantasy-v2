'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'
import {
  DEFAULT_WIZARD_FORMAT_OPTIONS,
  type WizardFormatOptions,
  getSurvivorTeamBounds,
  clampSurvivorTeamCount,
} from '@/lib/league-creation-wizard/wizard-format-options'
import { TOURNAMENT_PARTICIPANT_POOL_SIZES_EXTENDED } from '@/lib/tournament-mode/pool-sizes'
import { StepHeader } from './StepHelp'

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
  const survivorBounds = getSurvivorTeamBounds(sport)

  if (leagueType === 'redraft' || leagueType === 'best_ball') {
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
            Minimum pool size is 32 managers. The platform spins up multiple feeder leagues from this pool (see{' '}
            <span className="text-white/75">Tournament</span> hub after create).
          </p>
          <div className="space-y-1.5">
            <Label className="text-white/85">Participant pool size</Label>
            <Select
              value={String(v.tournamentParticipantPoolSize)}
              onValueChange={(x) => onChange({ tournamentParticipantPoolSize: Number(x) })}
            >
              <SelectTrigger className="border-white/20 bg-[#030a20] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOURNAMENT_PARTICIPANT_POOL_SIZES_EXTENDED.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} managers
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/85">Feeder league size</Label>
            <Select
              value={v.tournamentInitialLeagueSize === 'auto' ? 'auto' : String(v.tournamentInitialLeagueSize)}
              onValueChange={(x) =>
                onChange({
                  tournamentInitialLeagueSize: x === 'auto' ? 'auto' : Number(x),
                })
              }
            >
              <SelectTrigger className="border-white/20 bg-[#030a20] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (balance leagues)</SelectItem>
                {[10, 11, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} per feeder league
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <h4 className="text-sm font-semibold text-amber-100">Survivor</h4>
          <p className="text-xs text-white/55">
            Tribe count is capped at four; teams are grouped for tribal phases. Exile Island is provisioned after
            create.
          </p>
          <div className="space-y-1.5">
            <Label className="text-white/85">Teams ({survivorBounds.min}–{survivorBounds.max} for {sport})</Label>
            <Input
              type="number"
              min={survivorBounds.min}
              max={survivorBounds.max}
              value={v.survivorTeamCount}
              onChange={(e) =>
                onChange({
                  survivorTeamCount: clampSurvivorTeamCount(sport, Number(e.target.value) || survivorBounds.min),
                })
              }
              className="border-white/20 bg-[#030a20] text-white"
            />
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
                <SelectItem value="custom">I will name tribes (one per line)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {v.survivorTribeNameMode === 'custom' && (
            <textarea
              value={v.survivorCustomTribeNamesLines}
              onChange={(e) => onChange({ survivorCustomTribeNamesLines: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            />
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
          <label className="flex items-start gap-2 text-sm text-white/85">
            <input
              type="checkbox"
              checked={v.survivorChallengesSystemRun}
              onChange={(e) => onChange({ survivorChallengesSystemRun: e.target.checked })}
              className="mt-1 rounded border-white/30"
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
          <Label className="text-white/85 flex items-center gap-2">
            <input
              type="checkbox"
              checked={v.zombieUniverseMode}
              onChange={(e) => onChange({ zombieUniverseMode: e.target.checked })}
              className="rounded border-white/30"
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
          <label className="flex items-start gap-2 text-sm text-white/85">
            <input
              type="checkbox"
              checked={v.guillotineRulesAcknowledged}
              onChange={(e) => onChange({ guillotineRulesAcknowledged: e.target.checked })}
              className="mt-1 rounded border-white/30"
            />
            I understand eliminations run on scoring periods and can be adjusted in settings.
          </label>
        </div>
      )}

      {leagueType === 'big_brother' && (
        <div className="space-y-2 rounded-2xl border border-fuchsia-500/25 bg-fuchsia-950/10 p-4">
          <Label className="text-white/85">League subtitle (optional)</Label>
          <Input
            value={v.bigBrotherSubtitle}
            onChange={(e) => onChange({ bigBrotherSubtitle: e.target.value })}
            placeholder="e.g. Season 1 — AllFantasy"
            className="border-white/20 bg-[#030a20] text-white"
          />
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
            <Label className="text-white/85">Devy taxi spots</Label>
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
            <Label className="text-white/85">C2C taxi spots</Label>
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

    </div>
  )
}

'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  clampTeamCountForSport,
  getMaxTeamsForSport,
  getTeamCountOptionsForSport,
} from '@/lib/league-creation-wizard/sport-team-limits'
import { StepHeader } from './StepHelp'

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern' },
  { value: 'America/Chicago', label: 'Central' },
  { value: 'America/Denver', label: 'Mountain' },
  { value: 'America/Los_Angeles', label: 'Pacific' },
  { value: 'America/Phoenix', label: 'Arizona' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'America/Toronto', label: 'Toronto' },
  { value: 'America/Vancouver', label: 'Vancouver' },
  { value: 'Europe/London', label: 'London' },
] as const

export type TeamCountSelectorProps = {
  sport: string
  /** When set (e.g. survivor), team count options follow format rules instead of generic sport range. */
  leagueType?: string
  teamCount: number
  onTeamCountChange: (n: number) => void
}

export function TeamCountSelector({ sport, leagueType, teamCount, onTeamCountChange }: TeamCountSelectorProps) {
  const teamCounts = getTeamCountOptionsForSport(sport, leagueType)
  const maxTeams = getMaxTeamsForSport(sport)
  const safeTeamCount = clampTeamCountForSport(sport, teamCount, leagueType)
  const isSurvivor = String(leagueType ?? '').toLowerCase() === 'survivor'
  const isTournament = String(leagueType ?? '').toLowerCase() === 'tournament'
  const isDevyOrC2c =
    String(leagueType ?? '').toLowerCase() === 'devy' || String(leagueType ?? '').toLowerCase() === 'c2c'

  const teamLabel = isSurvivor ? 'Cast size (teams)' : isTournament ? 'Teams per feeder league' : 'Number of teams'
  const teamAria = isTournament ? 'Teams per feeder league' : 'Number of teams'

  return (
    <div className="space-y-1.5" data-testid={isTournament ? 'wizard-tournament-feeder-teams' : undefined}>
      <Label className="text-white/90">{teamLabel}</Label>
      <Select value={String(safeTeamCount)} onValueChange={(v) => onTeamCountChange(Number(v))}>
        <SelectTrigger
          className="mt-1.5 min-h-[44px] border-white/15 bg-[#050f1f]/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          title={
            isTournament
              ? 'Tournament hubs use 12-team feeder leagues; total managers are set on the next step'
              : 'Set how many managers will join this league'
          }
          aria-label={teamAria}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {teamCounts.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {isTournament ? `${n} teams (fixed)` : `${n} teams`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="mt-1 text-xs text-white/50">
        {isTournament ? (
          <>
            Tournament mode uses <span className="text-white/70">12 fantasy teams per feeder league</span> (one manager
            per team). On the next step you choose the <span className="text-white/70">total manager field</span>{' '}
            (72, 144, or 216) — we split that into 6, 12, or 18 feeder leagues automatically.
          </>
        ) : isSurvivor ? (
          'Survivor uses 16, 20, or 24 managers (one per team). Set on this step; tribe splits are on the next step.'
        ) : isDevyOrC2c ? (
          sport.toUpperCase() === 'NFL' ? (
            'Even team counts from 4–32 (NFL + NCAAF pool).'
          ) : (
            'Even team counts from 4–30 (NBA + NCAAB pool).'
          )
        ) : sport.toUpperCase() === 'NFL' ? (
          'NFL currently supports 16, 20, or 24 teams in this flow.'
        ) : (
          `Up to ${maxTeams} teams for ${sport}. You can change this later in settings.`
        )}
      </p>
    </div>
  )
}

export type TeamSizeSelectorProps = {
  /** Used to cap league size (one manager per team), ESPN / Sleeper–style limits per sport. */
  sport: string
  leagueType?: string
  name: string
  teamCount: number
  tradeReviewMode: 'none' | 'commissioner' | 'league_vote' | 'instant'
  /** IANA timezone for league schedule and waivers — stored as the league’s official timezone. */
  leagueTimezone: string
  onNameChange: (name: string) => void
  onTeamCountChange: (n: number) => void
  onTradeReviewModeChange: (mode: 'none' | 'commissioner' | 'league_vote' | 'instant') => void
  onTimezoneChange: (tz: string) => void
  showTeamCount?: boolean
}

/**
 * League name, number of teams, and official league timezone.
 */
export function TeamSizeSelector({
  sport,
  leagueType,
  name,
  teamCount,
  tradeReviewMode,
  leagueTimezone,
  onNameChange,
  onTeamCountChange,
  onTradeReviewModeChange,
  onTimezoneChange,
  showTeamCount = true,
}: TeamSizeSelectorProps) {
  return (
    <div className="space-y-6">
      <h3 className="sr-only">Team setup</h3>
      <StepHeader
        title="Name your league"
        description="Set the display name, how many teams you want, and the official league timezone (waivers, draft clocks, and league time)."
        help={
          <>
            Roster size and waiver or playoff details are configured in <strong>League settings</strong> after the league is created.
          </>
        }
        helpTitle="After you create"
      />
      <div className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#050f1f]/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:p-5">
        <div className="space-y-1.5">
          <Label className="text-cyan-200/95">League Name</Label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. My League"
            className="mt-1.5 min-h-[48px] rounded-lg border border-white/12 bg-[#050f1f]/80 px-3 text-lg text-white placeholder:text-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:ring-1 focus-visible:ring-cyan-400/30"
            aria-describedby="name-help"
            title="Editable later in league settings"
          />
          <p id="name-help" className="mt-1 text-sm text-white/70">This name is saved to your league.</p>
        </div>

        {showTeamCount ? (
          <TeamCountSelector
            sport={sport}
            leagueType={leagueType}
            teamCount={teamCount}
            onTeamCountChange={onTeamCountChange}
          />
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-white/90">League timezone</Label>
          <Select value={leagueTimezone} onValueChange={onTimezoneChange}>
            <SelectTrigger
              className="mt-1.5 min-h-[44px] border-white/15 bg-[#050f1f]/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              aria-label="League timezone"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((z) => (
                <SelectItem key={z.value} value={z.value}>
                  {z.label} ({z.value.replace(/_/g, ' ')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-white/50">
            Stored as the league&apos;s official timezone (schedule, waivers, draft).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/90">Trade review mode</Label>
          <Select value={tradeReviewMode} onValueChange={(v) => onTradeReviewModeChange(v as TeamSizeSelectorProps['tradeReviewMode'])}>
            <SelectTrigger
              className="mt-1.5 min-h-[44px] border-white/15 bg-[#050f1f]/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              aria-label="Trade review mode"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="commissioner">Commissioner review</SelectItem>
              <SelectItem value="league_vote">League vote</SelectItem>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="none">No review</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-white/50">Starting policy; full waiver and playoff controls are in league settings.</p>
        </div>
      </div>
    </div>
  )
}

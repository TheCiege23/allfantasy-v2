'use client'

import { useSportRules } from '@/hooks/useSportRules'
import { useSportPreset } from '@/hooks/useSportPreset'
import { LEAGUE_TYPE_LABELS, DRAFT_TYPE_LABELS } from '@/lib/league-creation-wizard/league-type-registry'
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_AUTOMATION_SETTINGS,
  DEFAULT_DRAFT_SETTINGS,
  DEFAULT_PLAYOFF_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_SCHEDULE_SETTINGS,
  DEFAULT_WAIVER_SETTINGS,
  type LeagueCreationWizardState,
} from '@/lib/league-creation-wizard/types'

export type LeagueSummaryPanelProps = {
  state: LeagueCreationWizardState
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 py-1.5 border-b border-white/10">
      <dt className="text-white/60">{label}</dt>
      <dd className="text-white/90 font-medium text-right max-w-[60%]">{value}</dd>
    </div>
  )
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</h3>
      <dl className="space-y-0 text-sm">{children}</dl>
    </div>
  )
}

/**
 * League Summary Review: displayed before creating the league. Shows sport, league type, draft type,
 * team count, scoring rules, AI settings, and automation settings for final confirmation.
 */
export function LeagueSummaryPanel({ state }: LeagueSummaryPanelProps) {
  const { rules } = useSportRules(state.sport, state.leagueVariant ?? undefined)
  const { preset: creationPreset } = useSportPreset(state.sport as any, state.leagueVariant ?? state.scoringPreset ?? undefined)
  const draftSettings = state.draftSettings ?? DEFAULT_DRAFT_SETTINGS
  const waiverSettings = state.waiverSettings ?? DEFAULT_WAIVER_SETTINGS
  const playoffSettings = state.playoffSettings ?? DEFAULT_PLAYOFF_SETTINGS
  const scheduleSettings = state.scheduleSettings ?? DEFAULT_SCHEDULE_SETTINGS
  const aiSettings = state.aiSettings ?? DEFAULT_AI_SETTINGS
  const automationSettings = state.automationSettings ?? DEFAULT_AUTOMATION_SETTINGS
  const privacySettings = state.privacySettings ?? DEFAULT_PRIVACY_SETTINGS
  const variantText = String(state.leagueVariant ?? state.scoringPreset ?? '').toUpperCase()
  const sportText = String(state.sport).toUpperCase()
  const isSoccer = sportText === 'SOCCER'
  const isNflIdp = sportText === 'NFL' && variantText.includes('IDP')
  const playerPoolLabel =
    isSoccer
      ? 'Soccer-only pool (GK/GKP, DEF, MID, FWD)'
      : isNflIdp
        ? 'NFL offensive + IDP defenders (DL, LB, DB, IDP FLEX)'
        : sportText === 'NFL'
          ? 'NFL offensive + DST'
          : `${sportText} players`
  const rosterSlotsLabel = rules
    ? rules.roster.slots
        .filter((s) => s.starterCount > 0 || s.slotName === 'BENCH' || s.slotName === 'IR')
        .map((s) => (s.starterCount > 0 ? (s.starterCount > 1 ? `${s.slotName}×${s.starterCount}` : s.slotName) : s.slotName))
        .join(', ')
    : null
  const scoringLabel = state.leagueVariant ?? state.scoringPreset ?? 'Default'
  const presetContextLabel =
    isSoccer
      ? 'Soccer sport with the soccer-specific default preset'
      : isNflIdp
        ? 'NFL sport with an IDP preset layered on top of NFL defaults'
        : null
  const scheduleLabel = creationPreset?.scheduleTemplate
    ? creationPreset.scheduleTemplate.playoffWeeks > 0
      ? `${creationPreset.scheduleTemplate.regularSeasonWeeks} wk regular, ${creationPreset.scheduleTemplate.playoffWeeks} wk playoffs · ${creationPreset.scheduleTemplate.matchupType.replace(/_/g, ' ')}`
      : `${creationPreset.scheduleTemplate.regularSeasonWeeks} wk regular · ${creationPreset.scheduleTemplate.matchupType.replace(/_/g, ' ')}`
    : null
  const calendarLabel =
    (creationPreset?.seasonCalendar?.regularSeasonPeriod && 'label' in creationPreset.seasonCalendar.regularSeasonPeriod
      ? (creationPreset.seasonCalendar.regularSeasonPeriod as { label?: string }).label
      : null) ?? null
  const teamMetadataLabel = creationPreset?.teamMetadata?.teams?.length
    ? `${creationPreset.teamMetadata.teams.length} teams with logo metadata`
    : null
  const defaultLeagueSettings =
    creationPreset?.defaultLeagueSettings && typeof creationPreset.defaultLeagueSettings === 'object'
      ? (creationPreset.defaultLeagueSettings as Record<string, unknown>)
      : null
  const leagueDefaultsLabel = `${state.teamCount} teams · ${playoffSettings.playoffTeamCount} playoff teams · ${scheduleSettings.regularSeasonLength} ${scheduleSettings.scheduleUnit}`
  const policyDefaultsLabel = [
    `scoring_mode=${String(defaultLeagueSettings?.scoring_mode ?? 'points')}`,
    `roster_mode=${
      state.leagueType === 'dynasty' || state.leagueType === 'devy' || state.leagueType === 'c2c'
        ? 'dynasty'
        : state.leagueType === 'keeper'
          ? 'keeper'
          : 'redraft'
    }`,
    `waiver_mode=${waiverSettings.waiverType}`,
    `trade_review_mode=${String(defaultLeagueSettings?.trade_review_mode ?? 'commissioner')}`,
  ].join(' · ')

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-white">Review & create</h2>
        <p className="text-sm text-white/70">
          Confirm your choices below. You can change most options later in league and draft settings.
        </p>
      </div>

      <SummarySection title="Sport & format">
        <SummaryRow label="Sport" value={state.sport} />
        <SummaryRow label="League type" value={LEAGUE_TYPE_LABELS[state.leagueType]} />
        <SummaryRow label="Draft type" value={DRAFT_TYPE_LABELS[state.draftType]} />
        <SummaryRow label="League name" value={state.name || '—'} />
        <SummaryRow label="Team count" value={state.teamCount} />
        <SummaryRow label="Roster size" value={state.rosterSize != null ? state.rosterSize : 'Default'} />
        {rosterSlotsLabel != null && <SummaryRow label="Roster slots" value={rosterSlotsLabel} />}
      </SummarySection>

      <SummarySection title="Scoring rules">
        <SummaryRow label="Scoring" value={scoringLabel} />
        <SummaryRow label="Player pool" value={playerPoolLabel} />
        {presetContextLabel != null && <SummaryRow label="Preset context" value={presetContextLabel} />}
        <SummaryRow label="League defaults" value={leagueDefaultsLabel} />
        <SummaryRow label="Policy defaults" value={policyDefaultsLabel} />
      </SummarySection>

      {(scheduleLabel != null || calendarLabel != null) && (
        <SummarySection title="Schedule & calendar">
          {scheduleLabel != null && <SummaryRow label="Fantasy schedule" value={scheduleLabel} />}
          {calendarLabel != null && <SummaryRow label="Season calendar" value={calendarLabel} />}
          {teamMetadataLabel != null && <SummaryRow label="Team metadata" value={teamMetadataLabel} />}
        </SummarySection>
      )}

      <SummarySection title="Draft details">
        <SummaryRow label="Rounds" value={draftSettings.rounds} />
        <SummaryRow
          label="Timer"
          value={
            draftSettings.timerSeconds != null && draftSettings.timerSeconds > 0
              ? `${draftSettings.timerSeconds}s`
              : 'None'
          }
        />
        {state.draftType === 'auction' && (
          <SummaryRow label="Auction budget" value={`$${draftSettings.auctionBudgetPerTeam ?? 200}`} />
        )}
      </SummarySection>

      <SummarySection title="Waiver defaults">
        <SummaryRow label="Waiver type" value={waiverSettings.waiverType} />
        <SummaryRow
          label="Processing days"
          value={
            waiverSettings.processingDays.length > 0
              ? waiverSettings.processingDays
                  .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] ?? String(d))
                  .join(', ')
              : 'None'
          }
        />
        <SummaryRow
          label="Processing time (UTC)"
          value={waiverSettings.processingTimeUtc ?? '—'}
        />
        <SummaryRow
          label="FAAB"
          value={
            waiverSettings.faabEnabled
              ? `$${waiverSettings.faabBudget ?? 0}`
              : 'Disabled'
          }
        />
        <SummaryRow
          label="Claim priority"
          value={waiverSettings.claimPriorityBehavior ?? '—'}
        />
        <SummaryRow
          label="Free agent unlock"
          value={waiverSettings.freeAgentUnlockBehavior ?? '—'}
        />
      </SummarySection>

      <SummarySection title="Playoff defaults">
        <SummaryRow label="Playoff teams" value={playoffSettings.playoffTeamCount} />
        <SummaryRow label="Playoff weeks" value={playoffSettings.playoffWeeks} />
        <SummaryRow
          label="Playoff start week"
          value={playoffSettings.playoffStartWeek ?? '—'}
        />
        <SummaryRow
          label="Seeding rules"
          value={playoffSettings.seedingRules}
        />
        <SummaryRow
          label="Tiebreakers"
          value={
            playoffSettings.tiebreakerRules.length > 0
              ? playoffSettings.tiebreakerRules.join(', ')
              : '—'
          }
        />
        <SummaryRow
          label="Byes / rounds"
          value={`${playoffSettings.firstRoundByes} byes · ${playoffSettings.totalRounds ?? 'auto'} rounds`}
        />
        <SummaryRow
          label="Consolation / third-place"
          value={`${playoffSettings.consolationBracketEnabled ? 'On' : 'Off'} · ${playoffSettings.thirdPlaceGameEnabled ? '3rd place on' : '3rd place off'}`}
        />
      </SummarySection>

      <SummarySection title="Schedule defaults">
        <SummaryRow label="Schedule unit" value={scheduleSettings.scheduleUnit} />
        <SummaryRow label="Regular season length" value={scheduleSettings.regularSeasonLength} />
        <SummaryRow label="Matchup frequency" value={scheduleSettings.matchupFrequency} />
        <SummaryRow label="Matchup cadence" value={scheduleSettings.matchupCadence} />
        <SummaryRow
          label="Head-to-head / points"
          value={scheduleSettings.headToHeadOrPointsBehavior}
        />
        <SummaryRow label="Lock time" value={scheduleSettings.lockTimeBehavior} />
        <SummaryRow label="Lock window" value={scheduleSettings.lockWindowBehavior} />
        <SummaryRow
          label="Scoring period"
          value={scheduleSettings.scoringPeriodBehavior}
        />
        <SummaryRow
          label="Reschedule handling"
          value={scheduleSettings.rescheduleHandling}
        />
        <SummaryRow
          label="Multi-game handling"
          value={scheduleSettings.doubleheaderOrMultiGameHandling}
        />
        <SummaryRow
          label="Playoff transition point"
          value={scheduleSettings.playoffTransitionPoint ?? '—'}
        />
        <SummaryRow
          label="Generation strategy"
          value={scheduleSettings.scheduleGenerationStrategy}
        />
      </SummarySection>

      <SummarySection title="AI settings">
        <SummaryRow label="AI ADP" value={aiSettings.aiAdpEnabled ? 'On' : 'Off'} />
        <SummaryRow label="Orphan AI manager" value={aiSettings.orphanTeamAiManagerEnabled ? 'On' : 'Off'} />
        <SummaryRow label="Draft helper" value={aiSettings.draftHelperEnabled ? 'On' : 'Off'} />
      </SummarySection>

      <SummarySection title="Automation settings">
        <SummaryRow label="Draft notifications" value={automationSettings.draftNotificationsEnabled ? 'On' : 'Off'} />
        <SummaryRow label="Autopick from queue" value={automationSettings.autopickFromQueueEnabled ? 'On' : 'Off'} />
        <SummaryRow label="Slow draft reminders" value={automationSettings.slowDraftRemindersEnabled ? 'On' : 'Off'} />
      </SummarySection>

      <SummarySection title="Privacy settings">
        <SummaryRow label="Visibility" value={privacySettings.visibility} />
        <SummaryRow label="Invite link" value={privacySettings.allowInviteLink ? 'Allowed' : 'Disabled'} />
      </SummarySection>
    </div>
  )
}

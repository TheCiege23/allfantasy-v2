'use client'

import type { LeagueCreationPresetPayload } from '@/hooks/useSportPreset'
import { LEAGUE_TYPE_LABELS, DRAFT_TYPE_LABELS } from '@/lib/league-creation-wizard/league-type-registry'
import {
  getLeagueVariantLabel,
  resolveCreationVariantOrDefault,
} from '@/lib/league-creation/LeagueVariantResolver'
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_AUTOMATION_SETTINGS,
  DEFAULT_COMMISSIONER_PREFERENCES,
  DEFAULT_DRAFT_SETTINGS,
  DEFAULT_PLAYOFF_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_SCHEDULE_SETTINGS,
  DEFAULT_WAIVER_SETTINGS,
  type LeagueCreationWizardState,
  type WizardCommissionerPreferences,
} from '@/lib/league-creation-wizard/types'

const COMMISSIONER_PREF_LABELS: Record<keyof WizardCommissionerPreferences, string> = {
  leagueAutomation: 'League automation',
  integrityMonitoring: 'Integrity monitoring',
  weeklyRecaps: 'Weekly recaps',
  draftCopilot: 'Draft copilot',
  matchupNarration: 'Matchup narration',
  fairnessAudit: 'Fairness audit',
  powerRankingsAi: 'AI power rankings',
  constitutionAssistant: 'Rules assistant',
}

function buildCommissionerPreferencesSummary(prefs: WizardCommissionerPreferences): string {
  const enabled = (Object.entries(prefs) as [keyof WizardCommissionerPreferences, boolean][])
    .filter(([, on]) => on)
    .map(([k]) => COMMISSIONER_PREF_LABELS[k])
  if (enabled.length === 0) {
    return 'None selected — enable anytime with AF Commissioner in league settings'
  }
  return `${enabled.length} on: ${enabled.join(' · ')}`
}

export type LeagueSummaryPanelProps = {
  state: LeagueCreationWizardState
  creationPreset?: LeagueCreationPresetPayload | null
}

function SummaryRow({
  label,
  value,
  testId,
}: {
  label: string
  value: React.ReactNode
  testId?: string
}) {
  return (
    <div className="flex justify-between gap-2 py-1.5 border-b border-white/10" data-testid={testId}>
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
function buildRosterSlotsLabel(
  starterSlots: Record<string, unknown> | undefined,
  benchSlots: number | null | undefined,
  irSlots: number | null | undefined
): string | null {
  if (!starterSlots || typeof starterSlots !== 'object') return null
  const starterLabels = Object.entries(starterSlots).flatMap(([slot, count]) => {
    if (typeof count !== 'number' || count <= 0) return []
    return [count > 1 ? `${slot}×${count}` : slot]
  })
  const labels = [...starterLabels]
  if (typeof benchSlots === 'number' && benchSlots > 0) labels.push(benchSlots > 1 ? `BENCH×${benchSlots}` : 'BENCH')
  if (typeof irSlots === 'number' && irSlots > 0) labels.push(irSlots > 1 ? `IR×${irSlots}` : 'IR')
  return labels.length > 0 ? labels.join(', ') : null
}

export function LeagueSummaryPanel({ state, creationPreset }: LeagueSummaryPanelProps) {
  const effectiveVariant = resolveCreationVariantOrDefault({
    sport: state.sport,
    leagueType: state.leagueType,
    requestedVariant: state.leagueVariant ?? state.scoringPreset ?? null,
  })
  const draftSettings = state.draftSettings ?? DEFAULT_DRAFT_SETTINGS
  const waiverSettings = state.waiverSettings ?? DEFAULT_WAIVER_SETTINGS
  const playoffSettings = state.playoffSettings ?? DEFAULT_PLAYOFF_SETTINGS
  const scheduleSettings = state.scheduleSettings ?? DEFAULT_SCHEDULE_SETTINGS
  const aiSettings = state.aiSettings ?? DEFAULT_AI_SETTINGS
  const automationSettings = state.automationSettings ?? DEFAULT_AUTOMATION_SETTINGS
  const privacySettings = state.privacySettings ?? DEFAULT_PRIVACY_SETTINGS
  const variantText = String(effectiveVariant ?? '').toUpperCase()
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
  const rosterSlotsLabel = buildRosterSlotsLabel(
    creationPreset?.roster?.starter_slots as Record<string, unknown> | undefined,
    creationPreset?.roster?.bench_slots ?? null,
    creationPreset?.roster?.IR_slots ?? null
  )
  const scoringLabel = getLeagueVariantLabel(effectiveVariant)
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
    `trade_review_mode=${state.tradeReviewMode ?? String(defaultLeagueSettings?.trade_review_mode ?? 'commissioner')}`,
  ].join(' · ')
  const scoringRulesPreview =
    creationPreset?.scoringTemplate &&
    Array.isArray((creationPreset.scoringTemplate as { rules?: unknown[] }).rules)
      ? ((creationPreset.scoringTemplate as { rules: Array<{ statKey?: string; pointsValue?: number; enabled?: boolean }> }).rules
          .filter((rule) => rule && rule.enabled !== false && typeof rule.statKey === 'string')
          .slice(0, 4)
          .map((rule) => `${String(rule.statKey)}=${Number(rule.pointsValue ?? 0)}`))
      : []
  const aiSummary = [
    aiSettings.aiAdpEnabled ? 'AI ADP on' : 'AI ADP off',
    aiSettings.orphanTeamAiManagerEnabled ? 'Orphan AI on' : 'Orphan AI off',
    aiSettings.draftHelperEnabled ? 'Draft helper on' : 'Draft helper off',
  ].join(' · ')
  const automationSummary = [
    automationSettings.draftNotificationsEnabled ? 'Notifications on' : 'Notifications off',
    automationSettings.autopickFromQueueEnabled ? 'Queue autopick on' : 'Queue autopick off',
    automationSettings.slowDraftRemindersEnabled ? 'Slow reminders on' : 'Slow reminders off',
  ].join(' · ')
  const commissionerSummary = buildCommissionerPreferencesSummary(
    state.commissionerPreferences ?? DEFAULT_COMMISSIONER_PREFERENCES,
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-white">Review & create</h2>
        <p className="text-sm text-white/70">
          Confirm your choices below. You can change most options later in league and draft settings.
        </p>
      </div>

      <SummarySection title="League summary">
        <SummaryRow label="Sport" value={state.sport} testId="league-summary-sport" />
        <SummaryRow
          label="League type"
          value={LEAGUE_TYPE_LABELS[state.leagueType]}
          testId="league-summary-league-type"
        />
        <SummaryRow
          label="Draft type"
          value={DRAFT_TYPE_LABELS[state.draftType]}
          testId="league-summary-draft-type"
        />
        <SummaryRow label="Team count" value={state.teamCount} testId="league-summary-team-count" />
        <SummaryRow
          label="Scoring rules"
          value={scoringRulesPreview.length > 0 ? scoringRulesPreview.join(', ') : scoringLabel}
          testId="league-summary-scoring-rules"
        />
        <SummaryRow label="AI settings" value={aiSummary} testId="league-summary-ai-settings" />
        <SummaryRow
          label="Automation settings"
          value={automationSummary}
          testId="league-summary-automation-settings"
        />
        <SummaryRow
          label="AF Commissioner AI"
          value={commissionerSummary}
          testId="league-summary-commissioner-prefs"
        />
      </SummarySection>

      <SummarySection title="Sport & format">
        <SummaryRow
          label="Starting point"
          value={
            state.setupSource === 'copy_league'
              ? 'Copied from another AllFantasy league'
              : state.setupSource === 'external_guide'
                ? 'Import reference (use /import for full sync)'
                : 'New league'
          }
        />
        <SummaryRow label="Timezone" value={state.leagueTimezone ?? 'America/New_York'} />
        <SummaryRow
          label="Scoring style shortcut"
          value={
            state.platformStyleMirror === 'espn'
              ? 'ESPN-style'
              : state.platformStyleMirror === 'yahoo'
                ? 'Yahoo-style'
                : state.platformStyleMirror === 'sleeper'
                  ? 'Sleeper-style'
                  : 'AllFantasy default'
          }
        />
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

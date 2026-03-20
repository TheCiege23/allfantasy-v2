'use client'

import { useSportRules } from '@/hooks/useSportRules'
import { useSportPreset } from '@/hooks/useSportPreset'
import { LEAGUE_TYPE_LABELS, DRAFT_TYPE_LABELS } from '@/lib/league-creation-wizard/league-type-registry'
import type { LeagueCreationWizardState } from '@/lib/league-creation-wizard/types'

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
  const rosterSlotsLabel = rules
    ? rules.roster.slots
        .filter((s) => s.starterCount > 0 || s.slotName === 'BENCH' || s.slotName === 'IR')
        .map((s) => (s.starterCount > 0 ? (s.starterCount > 1 ? `${s.slotName}×${s.starterCount}` : s.slotName) : s.slotName))
        .join(', ')
    : null
  const scoringLabel = state.leagueVariant ?? state.scoringPreset ?? 'Default'
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
      </SummarySection>

      {(scheduleLabel != null || calendarLabel != null) && (
        <SummarySection title="Schedule & calendar">
          {scheduleLabel != null && <SummaryRow label="Fantasy schedule" value={scheduleLabel} />}
          {calendarLabel != null && <SummaryRow label="Season calendar" value={calendarLabel} />}
          {teamMetadataLabel != null && <SummaryRow label="Team metadata" value={teamMetadataLabel} />}
        </SummarySection>
      )}

      <SummarySection title="Draft details">
        <SummaryRow label="Rounds" value={state.draftSettings.rounds} />
        <SummaryRow
          label="Timer"
          value={
            state.draftSettings.timerSeconds != null && state.draftSettings.timerSeconds > 0
              ? `${state.draftSettings.timerSeconds}s`
              : 'None'
          }
        />
        {state.draftType === 'auction' && (
          <SummaryRow label="Auction budget" value={`$${state.draftSettings.auctionBudgetPerTeam ?? 200}`} />
        )}
      </SummarySection>

      <SummarySection title="AI settings">
        <SummaryRow label="AI ADP" value={state.aiSettings.aiAdpEnabled ? 'On' : 'Off'} />
        <SummaryRow label="Orphan AI manager" value={state.aiSettings.orphanTeamAiManagerEnabled ? 'On' : 'Off'} />
        <SummaryRow label="Draft helper" value={state.aiSettings.draftHelperEnabled ? 'On' : 'Off'} />
      </SummarySection>

      <SummarySection title="Automation settings">
        <SummaryRow label="Draft notifications" value={state.automationSettings.draftNotificationsEnabled ? 'On' : 'Off'} />
        <SummaryRow label="Autopick from queue" value={state.automationSettings.autopickFromQueueEnabled ? 'On' : 'Off'} />
        <SummaryRow label="Slow draft reminders" value={state.automationSettings.slowDraftRemindersEnabled ? 'On' : 'Off'} />
      </SummarySection>
    </div>
  )
}

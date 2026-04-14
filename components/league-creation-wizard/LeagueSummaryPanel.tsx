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
  DEFAULT_PRIVACY_SETTINGS,
  type LeagueCreationWizardState,
  type WizardCommissionerPreferences,
  type WizardStepId,
} from '@/lib/league-creation-wizard/types'
import { DEFAULT_WIZARD_FORMAT_OPTIONS } from '@/lib/league-creation-wizard/wizard-format-options'

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

function getPlatformStyleLabel(platformStyleMirror: LeagueCreationWizardState['platformStyleMirror']): string {
  if (platformStyleMirror === 'espn') return 'ESPN-style'
  if (platformStyleMirror === 'yahoo') return 'Yahoo-style'
  return 'AllFantasy default'
}

export type LeagueSummaryPanelProps = {
  state: LeagueCreationWizardState
  creationPreset?: LeagueCreationPresetPayload | null
  onEditStep: (step: WizardStepId) => void
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
    <div className="flex justify-between gap-2 border-b border-white/10 py-1.5" data-testid={testId}>
      <div className="text-white/60">{label}</div>
      <div className="max-w-[60%] text-right font-medium text-white/90">{value}</div>
    </div>
  )
}

function SummarySection({
  title,
  stepId,
  onEditStep,
  children,
}: {
  title: string
  stepId: WizardStepId
  onEditStep: (step: WizardStepId) => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</h3>
        <button
          type="button"
          onClick={() => onEditStep(stepId)}
          className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
        >
          Edit
        </button>
      </div>
      <div className="space-y-0 text-sm">{children}</div>
    </div>
  )
}

/**
 * League Summary Review: displayed before creating the league.
 */
export function LeagueSummaryPanel({ state, creationPreset: _creationPreset, onEditStep }: LeagueSummaryPanelProps) {
  const effectiveVariant = resolveCreationVariantOrDefault({
    sport: state.sport,
    leagueType: state.leagueType,
    requestedVariant: state.leagueVariant ?? state.scoringPreset ?? null,
  })
  const aiSettings = state.aiSettings ?? DEFAULT_AI_SETTINGS
  const automationSettings = state.automationSettings ?? DEFAULT_AUTOMATION_SETTINGS
  const privacySettings = state.privacySettings ?? DEFAULT_PRIVACY_SETTINGS
  const variantText = getLeagueVariantLabel(effectiveVariant)
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
  const formatOpts = { ...DEFAULT_WIZARD_FORMAT_OPTIONS, ...state.formatOptions }
  const survivorTribes = formatOpts.survivorTribeCountOverride ?? 4
  const survivorCustomNames = formatOpts.survivorCustomTribeNamesLines
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-white">Review & create</h2>
        <p className="text-sm text-white/70">
          Confirm your choices. Use <strong className="text-white/90">Edit</strong> to jump back to a step; you&apos;ll
          return here when done.
        </p>
      </div>

      <SummarySection title="Sport & format" stepId="sport" onEditStep={onEditStep}>
        <SummaryRow label="Sport" value={state.sport} testId="league-summary-sport" />
        <SummaryRow label="League type" value={LEAGUE_TYPE_LABELS[state.leagueType]} testId="league-summary-league-type" />
        <SummaryRow label="Draft type" value={DRAFT_TYPE_LABELS[state.draftType]} testId="league-summary-draft-type" />
      </SummarySection>

      <SummarySection title="League details" stepId="team_setup" onEditStep={onEditStep}>
        <SummaryRow label="League name" value={state.name.trim() || '—'} />
        <SummaryRow
          label={state.leagueType === 'survivor' ? 'Cast size (teams)' : 'Teams'}
          value={state.teamCount}
        />
        {state.leagueType === 'survivor' ? (
          <>
            <SummaryRow label="Tribes" value={survivorTribes} />
            <SummaryRow
              label="Tribe names"
              value={
                formatOpts.survivorTribeNameMode === 'custom'
                  ? survivorCustomNames.length > 0
                    ? survivorCustomNames.join(' · ')
                    : '—'
                  : 'Auto-generated'
              }
            />
          </>
        ) : null}
        <SummaryRow label="Timezone" value={state.leagueTimezone ?? 'America/New_York'} />
        <SummaryRow label="Trade review" value={state.tradeReviewMode} />
      </SummarySection>

      <SummarySection title="Scoring" stepId="scoring" onEditStep={onEditStep}>
        <SummaryRow label="Platform style" value={getPlatformStyleLabel(state.platformStyleMirror)} />
        <SummaryRow label="Preset / variant" value={variantText} />
      </SummarySection>

      <SummarySection title="AI, automation & privacy" stepId="draft_privacy" onEditStep={onEditStep}>
        <SummaryRow label="AI" value={aiSummary} testId="league-summary-ai-settings" />
        <SummaryRow label="Automation" value={automationSummary} testId="league-summary-automation-settings" />
        <SummaryRow label="AF Commissioner AI" value={commissionerSummary} testId="league-summary-commissioner-prefs" />
        <SummaryRow label="Visibility" value={privacySettings.visibility} />
        <SummaryRow label="Invite link" value={privacySettings.allowInviteLink ? 'Allowed' : 'Disabled'} />
      </SummarySection>
    </div>
  )
}

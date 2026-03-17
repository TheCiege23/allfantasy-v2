'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  WIZARD_STEP_ORDER,
  DEFAULT_DRAFT_SETTINGS,
  DEFAULT_AI_SETTINGS,
  DEFAULT_AUTOMATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
} from '@/lib/league-creation-wizard/types'
import type {
  LeagueCreationWizardState,
  WizardStepId,
  LeagueTypeId,
  DraftTypeId,
  WizardDraftSettings,
  WizardAISettings,
  WizardAutomationSettings,
  WizardPrivacySettings,
} from '@/lib/league-creation-wizard/types'
import { getAllowedLeagueTypesForSport, getAllowedDraftTypesForLeagueType, isDynastyLeagueType } from '@/lib/league-creation-wizard/league-type-registry'
import { WizardStepContainer } from './WizardStepContainer'
import { WizardStepNav } from './WizardStepNav'
import { SportSelector } from './SportSelector'
import { LeagueTypeSelector } from './LeagueTypeSelector'
import { DraftTypeSelector } from './DraftTypeSelector'
import { TeamSizeSelector } from './TeamSizeSelector'

/** Lazy-loaded step panels to shrink initial bundle and improve mobile TTI. */
const ScoringPresetSelector = dynamic(
  () => import('./ScoringPresetSelector').then((m) => ({ default: m.ScoringPresetSelector })),
  { loading: () => <StepPanelSkeleton />, ssr: true }
)
const DraftSettingsPanel = dynamic(
  () => import('./DraftSettingsPanel').then((m) => ({ default: m.DraftSettingsPanel })),
  { loading: () => <StepPanelSkeleton />, ssr: true }
)
const AISettingsPanel = dynamic(
  () => import('./AISettingsPanel').then((m) => ({ default: m.AISettingsPanel })),
  { loading: () => <StepPanelSkeleton />, ssr: true }
)
const AutomationSettingsPanel = dynamic(
  () => import('./AutomationSettingsPanel').then((m) => ({ default: m.AutomationSettingsPanel })),
  { loading: () => <StepPanelSkeleton />, ssr: true }
)
const LeaguePrivacyPanel = dynamic(
  () => import('./LeaguePrivacyPanel').then((m) => ({ default: m.LeaguePrivacyPanel })),
  { loading: () => <StepPanelSkeleton />, ssr: true }
)
const LeagueSummaryPanel = dynamic(
  () => import('./LeagueSummaryPanel').then((m) => ({ default: m.LeagueSummaryPanel })),
  { loading: () => <StepPanelSkeleton />, ssr: true }
)

function StepPanelSkeleton() {
  return (
    <div className="min-h-[140px] flex items-center justify-center text-white/50 text-sm" aria-hidden>
      Loading…
    </div>
  )
}

const STEP_LABELS: Record<WizardStepId, string> = {
  sport: 'Sport',
  league_type: 'League type',
  draft_type: 'Draft type',
  team_setup: 'Team setup',
  scoring: 'Scoring',
  draft_settings: 'Draft settings',
  ai_settings: 'AI',
  automation: 'Automation',
  privacy: 'Privacy',
  review: 'Review',
}

const initialState: LeagueCreationWizardState = {
  step: 'sport',
  sport: 'NFL',
  leagueType: 'redraft',
  draftType: 'snake',
  name: '',
  teamCount: 12,
  rosterSize: null,
  scoringPreset: null,
  leagueVariant: null,
  draftSettings: { ...DEFAULT_DRAFT_SETTINGS },
  aiSettings: { ...DEFAULT_AI_SETTINGS },
  automationSettings: { ...DEFAULT_AUTOMATION_SETTINGS },
  privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
}

export type LeagueCreationWizardProps = {
  onSuccess?: (leagueId: string) => void
  /** Prefill wizard from a template (payload from LeagueTemplate). */
  initialWizardState?: Partial<Omit<LeagueCreationWizardState, 'step'>>
  /** When set, review step shows "Save as template"; called with current state. */
  onSaveAsTemplate?: (state: LeagueCreationWizardState) => void
  /** True while save-as-template request is in progress. */
  savingTemplate?: boolean
}

export function LeagueCreationWizard({
  onSuccess,
  initialWizardState,
  onSaveAsTemplate,
  savingTemplate = false,
}: LeagueCreationWizardProps) {
  const router = useRouter()
  const [state, setState] = useState<LeagueCreationWizardState>(() => {
    const merged = { ...initialState, ...(initialWizardState ?? {}) }
    merged.step = 'sport'
    return merged
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stepIndex = WIZARD_STEP_ORDER.indexOf(state.step)
  const currentStepNumber = stepIndex + 1
  const totalSteps = WIZARD_STEP_ORDER.length
  const stepLabel = STEP_LABELS[state.step]

  const go = useCallback((step: WizardStepId) => {
    setState((s) => ({ ...s, step }))
    setError(null)
  }, [])

  const goNext = useCallback(() => {
    const idx = WIZARD_STEP_ORDER.indexOf(state.step)
    if (idx < WIZARD_STEP_ORDER.length - 1) go(WIZARD_STEP_ORDER[idx + 1]!)
    else go('review')
  }, [state.step, go])

  const goBack = useCallback(() => {
    const idx = WIZARD_STEP_ORDER.indexOf(state.step)
    if (idx > 0) go(WIZARD_STEP_ORDER[idx - 1]!)
  }, [state.step, go])

  const handleSportChange = useCallback((sport: string) => {
    setState((s) => {
      const allowed = getAllowedLeagueTypesForSport(sport)
      const leagueType = allowed.includes(s.leagueType) ? s.leagueType : (allowed[0] ?? 'redraft')
      const draftAllowed = getAllowedDraftTypesForLeagueType(leagueType)
      const draftType = draftAllowed.includes(s.draftType) ? s.draftType : (draftAllowed[0] ?? 'snake')
      return { ...s, sport, leagueType, draftType }
    })
  }, [])

  const handleLeagueTypeChange = useCallback((leagueType: LeagueTypeId) => {
    setState((s) => {
      const draftAllowed = getAllowedDraftTypesForLeagueType(leagueType)
      const draftType = draftAllowed.includes(s.draftType) ? s.draftType : (draftAllowed[0] ?? 'snake')
      return { ...s, leagueType, draftType }
    })
  }, [])

  const handleDraftTypeChange = useCallback((d: DraftTypeId) => {
    setState((s) => ({ ...s, draftType: d }))
  }, [])

  const handleNameChange = useCallback((n: string) => setState((s) => ({ ...s, name: n })), [])
  const handleTeamCountChange = useCallback((n: number) => setState((s) => ({ ...s, teamCount: n })), [])
  const handleRosterSizeChange = useCallback((n: number | null) => setState((s) => ({ ...s, rosterSize: n })), [])

  const handleScoringChange = useCallback((v: string | null) => {
    setState((s) => ({ ...s, scoringPreset: v, leagueVariant: v }))
  }, [])

  const handleDraftSettingsChange = useCallback((patch: Partial<WizardDraftSettings>) => {
    setState((s) => ({ ...s, draftSettings: { ...s.draftSettings, ...patch } }))
  }, [])

  const handleAiSettingsChange = useCallback((patch: Partial<WizardAISettings>) => {
    setState((s) => ({ ...s, aiSettings: { ...s.aiSettings, ...patch } }))
  }, [])

  const handleAutomationChange = useCallback((patch: Partial<WizardAutomationSettings>) => {
    setState((s) => ({ ...s, automationSettings: { ...s.automationSettings, ...patch } }))
  }, [])

  const handlePrivacyChange = useCallback((patch: Partial<WizardPrivacySettings>) => {
    setState((s) => ({ ...s, privacySettings: { ...s.privacySettings, ...patch } }))
  }, [])

  const handleCreate = useCallback(async () => {
    setCreating(true)
    setError(null)
    try {
      const isDynasty = isDynastyLeagueType(state.leagueType)
      const leagueVariant = state.leagueVariant ?? (state.sport === 'NFL' ? 'STANDARD' : null)
      const name = state.name.trim() || `${state.sport} League`
      const devyRounds =
        state.draftSettings.devyRounds?.length > 0
          ? state.draftSettings.devyRounds
          : state.leagueType === 'devy'
            ? [1]
            : []
      const c2cCollegeRounds =
        state.draftSettings.c2cCollegeRounds?.length > 0
          ? state.draftSettings.c2cCollegeRounds
          : state.leagueType === 'c2c'
            ? [1]
            : []
      const body = {
        name,
        platform: 'manual',
        sport: state.sport,
        isDynasty,
        leagueVariant,
        leagueSize: state.teamCount,
        scoring: leagueVariant ?? undefined,
        league_type: state.leagueType,
        draft_type: state.draftType,
        settings: {
          league_type: state.leagueType,
          draft_type: state.draftType,
          draft_rounds: state.draftSettings.rounds,
          draft_timer_seconds: state.draftSettings.timerSeconds,
          auction_budget_per_team: state.draftSettings.auctionBudgetPerTeam,
          keeper_max_keepers: state.draftSettings.keeperMaxKeepers,
          devy_rounds: devyRounds,
          c2c_college_rounds: c2cCollegeRounds,
          ai_adp_enabled: state.aiSettings.aiAdpEnabled,
          orphan_team_ai_manager_enabled: state.aiSettings.orphanTeamAiManagerEnabled,
          draft_helper_enabled: state.aiSettings.draftHelperEnabled,
          draft_notifications_enabled: state.automationSettings.draftNotificationsEnabled,
          autopick_from_queue_enabled: state.automationSettings.autopickFromQueueEnabled,
          slow_draft_reminders_enabled: state.automationSettings.slowDraftRemindersEnabled,
          visibility: state.privacySettings.visibility,
          allow_invite_link: state.privacySettings.allowInviteLink,
        },
      }
      const res = await fetch('/api/league/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Failed to create league')
        return
      }
      const leagueId = data.league?.id
      if (leagueId) {
        onSuccess?.(leagueId)
        router.push(`/app/league/${leagueId}`)
      } else {
        setError('League created but no ID returned')
      }
    } catch (e) {
      setError((e as Error).message ?? 'Request failed')
    } finally {
      setCreating(false)
    }
  }, [state, router, onSuccess])

  return (
    <div className="mx-auto max-w-lg px-4 py-6 min-h-0 flex flex-col">
      <div className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5 flex flex-col min-h-0">
        <WizardStepContainer
          stepNumber={currentStepNumber}
          totalSteps={totalSteps}
          stepLabel={stepLabel}
        >
          {state.step === 'sport' && (
            <>
              <SportSelector value={state.sport} onChange={handleSportChange} />
              <WizardStepNav onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'league_type' && (
            <>
              <LeagueTypeSelector
                sport={state.sport}
                value={state.leagueType}
                onChange={handleLeagueTypeChange}
              />
              <WizardStepNav onBack={goBack} onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'draft_type' && (
            <>
              <DraftTypeSelector
                leagueType={state.leagueType}
                value={state.draftType}
                onChange={handleDraftTypeChange}
              />
              <WizardStepNav onBack={goBack} onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'team_setup' && (
            <>
              <TeamSizeSelector
                name={state.name}
                teamCount={state.teamCount}
                rosterSize={state.rosterSize}
                onNameChange={handleNameChange}
                onTeamCountChange={handleTeamCountChange}
                onRosterSizeChange={handleRosterSizeChange}
              />
              <WizardStepNav onBack={goBack} onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'scoring' && (
            <>
              <ScoringPresetSelector
                sport={state.sport}
                value={state.scoringPreset ?? state.leagueVariant}
                onChange={handleScoringChange}
              />
              <WizardStepNav onBack={goBack} onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'draft_settings' && (
            <>
              <DraftSettingsPanel
                leagueType={state.leagueType}
                draftType={state.draftType}
                draftSettings={state.draftSettings}
                onDraftSettingsChange={handleDraftSettingsChange}
              />
              <WizardStepNav onBack={goBack} onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'ai_settings' && (
            <>
              <AISettingsPanel
                value={state.aiSettings}
                onChange={handleAiSettingsChange}
              />
              <WizardStepNav onBack={goBack} onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'automation' && (
            <>
              <AutomationSettingsPanel
                value={state.automationSettings}
                onChange={handleAutomationChange}
              />
              <WizardStepNav onBack={goBack} onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'privacy' && (
            <>
              <LeaguePrivacyPanel
                value={state.privacySettings}
                onChange={handlePrivacyChange}
              />
              <WizardStepNav onBack={goBack} onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'review' && (
            <>
              <LeagueSummaryPanel state={state} />
              {onSaveAsTemplate && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSaveAsTemplate(state)}
                    disabled={savingTemplate}
                    className="text-sm text-purple-300 hover:text-purple-200 disabled:opacity-50"
                  >
                    {savingTemplate ? 'Saving…' : 'Save as template'}
                  </button>
                </div>
              )}
              <WizardStepNav
                onBack={goBack}
                isReview
                onCreate={handleCreate}
                creating={creating}
                error={error}
              />
            </>
          )}
        </WizardStepContainer>
      </div>
    </div>
  )
}

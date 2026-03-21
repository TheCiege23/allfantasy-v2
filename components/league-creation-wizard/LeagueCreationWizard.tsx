'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  WIZARD_STEP_ORDER,
  DEFAULT_DRAFT_SETTINGS,
  DEFAULT_WAIVER_SETTINGS,
  DEFAULT_PLAYOFF_SETTINGS,
  DEFAULT_SCHEDULE_SETTINGS,
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
  WizardWaiverSettings,
  WizardPlayoffSettings,
  WizardScheduleSettings,
  WizardAISettings,
  WizardAutomationSettings,
  WizardPrivacySettings,
} from '@/lib/league-creation-wizard/types'
import { useSportPreset } from '@/hooks/useSportPreset'
import { getAllowedLeagueTypesForSport, getAllowedDraftTypesForLeagueType, isDynastyLeagueType } from '@/lib/league-creation-wizard/league-type-registry'
import { WizardStepContainer } from './WizardStepContainer'
import { WizardStepNav } from './WizardStepNav'
import { SportSelector } from './SportSelector'
import { LeagueTypeSelector } from './LeagueTypeSelector'
import { DraftTypeSelector } from './DraftTypeSelector'
import { TeamSizeSelector } from './TeamSizeSelector'
import { LeagueSettingsPreviewPanel } from '@/components/league-creation'
import { getVariantsForSport } from '@/lib/sport-defaults/LeagueVariantRegistry'

/** Lazy-loaded step panels to shrink initial bundle and improve mobile TTI. */
const ScoringPresetSelector = dynamic(
  () => import('./ScoringPresetSelector').then((m) => ({ default: m.ScoringPresetSelector })),
  { loading: () => <StepPanelSkeleton />, ssr: true }
)
const DraftSettingsPanel = dynamic(
  () => import('./DraftSettingsPanel').then((m) => ({ default: m.DraftSettingsPanel })),
  { loading: () => <StepPanelSkeleton />, ssr: true }
)
const WaiverSettingsPanel = dynamic(
  () => import('./WaiverSettingsPanel').then((m) => ({ default: m.WaiverSettingsPanel })),
  { loading: () => <StepPanelSkeleton />, ssr: true }
)
const PlayoffSettingsPanel = dynamic(
  () => import('./PlayoffSettingsPanel').then((m) => ({ default: m.PlayoffSettingsPanel })),
  { loading: () => <StepPanelSkeleton />, ssr: true }
)
const ScheduleSettingsPanel = dynamic(
  () => import('./ScheduleSettingsPanel').then((m) => ({ default: m.ScheduleSettingsPanel })),
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
const SportSummaryCard = dynamic(
  () => import('./SportSummaryCard').then((m) => ({ default: m.SportSummaryCard })),
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
  waiver_settings: 'Waiver settings',
  playoff_settings: 'Playoff settings',
  schedule_settings: 'Schedule settings',
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
  waiverSettings: { ...DEFAULT_WAIVER_SETTINGS },
  playoffSettings: { ...DEFAULT_PLAYOFF_SETTINGS },
  scheduleSettings: { ...DEFAULT_SCHEDULE_SETTINGS },
  aiSettings: { ...DEFAULT_AI_SETTINGS },
  automationSettings: { ...DEFAULT_AUTOMATION_SETTINGS },
  privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
}

function toWizardWaiverSettings(
  waiver: {
    waiver_type?: string
    processing_days?: number[] | null
    processing_time_utc?: string | null
    faab_enabled?: boolean
    FAAB_budget_default?: number | null
    faab_reset_rules?: string | null
    claim_priority_behavior?: string | null
    continuous_waivers_behavior?: boolean
    free_agent_unlock_behavior?: string | null
    game_lock_behavior?: string | null
    drop_lock_behavior?: string | null
    same_day_add_drop_rules?: string | null
    max_claims_per_period?: number | null
  } | undefined
): WizardWaiverSettings {
  if (!waiver) return { ...DEFAULT_WAIVER_SETTINGS }
  const fallbackType = (waiver.waiver_type ?? 'faab') as WizardWaiverSettings['waiverType']
  const faabEnabled = waiver.faab_enabled ?? fallbackType === 'faab'
  return {
    waiverType: fallbackType,
    processingDays: Array.isArray(waiver.processing_days) ? waiver.processing_days : [],
    processingTimeUtc: waiver.processing_time_utc ?? null,
    faabEnabled,
    faabBudget: waiver.FAAB_budget_default ?? (faabEnabled ? 100 : null),
    faabResetRules: waiver.faab_reset_rules ?? 'never',
    claimPriorityBehavior: waiver.claim_priority_behavior ?? (faabEnabled ? 'faab_highest' : 'priority_lowest_first'),
    continuousWaiversBehavior: waiver.continuous_waivers_behavior ?? false,
    freeAgentUnlockBehavior: waiver.free_agent_unlock_behavior ?? 'after_waiver_run',
    gameLockBehavior: waiver.game_lock_behavior ?? 'game_time',
    dropLockBehavior: waiver.drop_lock_behavior ?? 'lock_with_game',
    sameDayAddDropRules: waiver.same_day_add_drop_rules ?? 'allow_if_not_played',
    maxClaimsPerPeriod: waiver.max_claims_per_period ?? null,
  }
}

function toWizardPlayoffSettings(
  defaultLeagueSettings: Record<string, unknown> | undefined,
  fallbackPlayoffTeamCount: number | undefined
): WizardPlayoffSettings {
  if (!defaultLeagueSettings) {
    return {
      ...DEFAULT_PLAYOFF_SETTINGS,
      playoffTeamCount: fallbackPlayoffTeamCount ?? DEFAULT_PLAYOFF_SETTINGS.playoffTeamCount,
    }
  }

  const structure =
    defaultLeagueSettings.playoff_structure &&
    typeof defaultLeagueSettings.playoff_structure === 'object'
      ? (defaultLeagueSettings.playoff_structure as Record<string, unknown>)
      : {}

  const read = <T,>(key: string, fallback: T): T => {
    const inStructure = structure[key]
    if (inStructure !== undefined && inStructure !== null) return inStructure as T
    const inRoot = defaultLeagueSettings[key]
    if (inRoot !== undefined && inRoot !== null) return inRoot as T
    return fallback
  }

  return {
    playoffTeamCount: Number(
      read(
        'playoff_team_count',
        fallbackPlayoffTeamCount ?? DEFAULT_PLAYOFF_SETTINGS.playoffTeamCount
      )
    ),
    playoffWeeks: Number(read('playoff_weeks', DEFAULT_PLAYOFF_SETTINGS.playoffWeeks)),
    playoffStartWeek:
      read<number | null>('playoff_start_week', DEFAULT_PLAYOFF_SETTINGS.playoffStartWeek) ?? null,
    seedingRules: String(read('seeding_rules', DEFAULT_PLAYOFF_SETTINGS.seedingRules)),
    tiebreakerRules: Array.isArray(read('tiebreaker_rules', []))
      ? (read('tiebreaker_rules', []) as string[])
      : DEFAULT_PLAYOFF_SETTINGS.tiebreakerRules,
    byeRules: read<string | null>('bye_rules', DEFAULT_PLAYOFF_SETTINGS.byeRules) ?? null,
    firstRoundByes: Number(read('first_round_byes', DEFAULT_PLAYOFF_SETTINGS.firstRoundByes)),
    matchupLength: Number(read('matchup_length', DEFAULT_PLAYOFF_SETTINGS.matchupLength)),
    totalRounds: read<number | null>('total_rounds', DEFAULT_PLAYOFF_SETTINGS.totalRounds) ?? null,
    consolationBracketEnabled: Boolean(
      read('consolation_bracket_enabled', DEFAULT_PLAYOFF_SETTINGS.consolationBracketEnabled)
    ),
    thirdPlaceGameEnabled: Boolean(
      read('third_place_game_enabled', DEFAULT_PLAYOFF_SETTINGS.thirdPlaceGameEnabled)
    ),
    toiletBowlEnabled: Boolean(
      read('toilet_bowl_enabled', DEFAULT_PLAYOFF_SETTINGS.toiletBowlEnabled)
    ),
    championshipLength: Number(
      read('championship_length', DEFAULT_PLAYOFF_SETTINGS.championshipLength)
    ),
    consolationPlaysFor: (read(
      'consolation_plays_for',
      DEFAULT_PLAYOFF_SETTINGS.consolationPlaysFor
    ) ?? 'none') as WizardPlayoffSettings['consolationPlaysFor'],
    reseedBehavior: String(read('reseed_behavior', DEFAULT_PLAYOFF_SETTINGS.reseedBehavior)),
  }
}

function toWizardScheduleSettings(
  defaultLeagueSettings: Record<string, unknown> | undefined
): WizardScheduleSettings {
  if (!defaultLeagueSettings) return { ...DEFAULT_SCHEDULE_SETTINGS }

  const read = <T,>(key: string, fallback: T): T => {
    const value = defaultLeagueSettings[key]
    return value === undefined || value === null ? fallback : (value as T)
  }

  return {
    scheduleUnit: String(read('schedule_unit', DEFAULT_SCHEDULE_SETTINGS.scheduleUnit)) as WizardScheduleSettings['scheduleUnit'],
    regularSeasonLength: Number(
      read('regular_season_length', DEFAULT_SCHEDULE_SETTINGS.regularSeasonLength)
    ),
    matchupFrequency: String(read('matchup_frequency', DEFAULT_SCHEDULE_SETTINGS.matchupFrequency)) as WizardScheduleSettings['matchupFrequency'],
    matchupCadence: String(read('schedule_cadence', DEFAULT_SCHEDULE_SETTINGS.matchupCadence)) as WizardScheduleSettings['matchupCadence'],
    headToHeadOrPointsBehavior: String(
      read(
        'schedule_head_to_head_behavior',
        DEFAULT_SCHEDULE_SETTINGS.headToHeadOrPointsBehavior
      )
    ),
    lockTimeBehavior: String(read('lock_time_behavior', DEFAULT_SCHEDULE_SETTINGS.lockTimeBehavior)) as WizardScheduleSettings['lockTimeBehavior'],
    lockWindowBehavior: String(
      read('schedule_lock_window_behavior', DEFAULT_SCHEDULE_SETTINGS.lockWindowBehavior)
    ),
    scoringPeriodBehavior: String(
      read('schedule_scoring_period_behavior', DEFAULT_SCHEDULE_SETTINGS.scoringPeriodBehavior)
    ),
    rescheduleHandling: String(
      read('schedule_reschedule_handling', DEFAULT_SCHEDULE_SETTINGS.rescheduleHandling)
    ),
    doubleheaderOrMultiGameHandling: String(
      read(
        'schedule_doubleheader_handling',
        DEFAULT_SCHEDULE_SETTINGS.doubleheaderOrMultiGameHandling
      )
    ),
    playoffTransitionPoint:
      read<number | null>(
        'schedule_playoff_transition_point',
        DEFAULT_SCHEDULE_SETTINGS.playoffTransitionPoint
      ) ?? null,
    scheduleGenerationStrategy: String(
      read(
        'schedule_generation_strategy',
        DEFAULT_SCHEDULE_SETTINGS.scheduleGenerationStrategy
      )
    ),
  }
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
  const skipInitialWaiverPresetSyncRef = useRef(Boolean(initialWizardState?.waiverSettings))
  const lastWaiverPresetKeyRef = useRef<string | null>(null)
  const waiverManualOverrideKeyRef = useRef<string | null>(null)
  const skipInitialPlayoffPresetSyncRef = useRef(Boolean(initialWizardState?.playoffSettings))
  const lastPlayoffPresetKeyRef = useRef<string | null>(null)
  const playoffManualOverrideKeyRef = useRef<string | null>(null)
  const skipInitialSchedulePresetSyncRef = useRef(Boolean(initialWizardState?.scheduleSettings))
  const lastSchedulePresetKeyRef = useRef<string | null>(null)
  const scheduleManualOverrideKeyRef = useRef<string | null>(null)

  const { preset: creationPreset } = useSportPreset(state.sport as any, state.leagueVariant ?? state.scoringPreset ?? undefined)
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
      const variants = getVariantsForSport(sport)
      const defaultVariant = variants[0]?.value ?? null
      return {
        ...s,
        sport,
        leagueType,
        draftType,
        leagueVariant: defaultVariant,
        scoringPreset: defaultVariant,
      }
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

  const handleWaiverSettingsChange = useCallback((patch: Partial<WizardWaiverSettings>) => {
    setState((s) => {
      const key = `${s.sport}|${s.leagueVariant ?? s.scoringPreset ?? ''}`
      waiverManualOverrideKeyRef.current = key
      return { ...s, waiverSettings: { ...s.waiverSettings, ...patch } }
    })
  }, [])

  const handlePlayoffSettingsChange = useCallback((patch: Partial<WizardPlayoffSettings>) => {
    setState((s) => {
      const key = `${s.sport}|${s.leagueVariant ?? s.scoringPreset ?? ''}`
      playoffManualOverrideKeyRef.current = key
      return { ...s, playoffSettings: { ...s.playoffSettings, ...patch } }
    })
  }, [])

  const handleScheduleSettingsChange = useCallback((patch: Partial<WizardScheduleSettings>) => {
    setState((s) => {
      const key = `${s.sport}|${s.leagueVariant ?? s.scoringPreset ?? ''}`
      scheduleManualOverrideKeyRef.current = key
      return { ...s, scheduleSettings: { ...s.scheduleSettings, ...patch } }
    })
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
      const leagueVariant =
        state.leagueVariant ??
        'STANDARD'
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
        rosterSize: state.rosterSize ?? undefined,
        scoring: leagueVariant ?? undefined,
        league_type: state.leagueType,
        draft_type: state.draftType,
        settings: {
          league_size: state.teamCount,
          roster_size: state.rosterSize,
          league_type: state.leagueType,
          draft_type: state.draftType,
          draft_rounds: state.draftSettings.rounds,
          draft_timer_seconds: state.draftSettings.timerSeconds,
          draft_third_round_reversal: state.draftSettings.thirdRoundReversal,
          third_round_reversal: state.draftSettings.thirdRoundReversal,
          waiver_type: state.waiverSettings.waiverType,
          waiver_processing_days: state.waiverSettings.processingDays,
          waiver_processing_time_utc: state.waiverSettings.processingTimeUtc,
          faab_enabled: state.waiverSettings.faabEnabled,
          faab_budget: state.waiverSettings.faabBudget,
          faab_reset_rules: state.waiverSettings.faabResetRules,
          waiver_claim_priority_behavior: state.waiverSettings.claimPriorityBehavior,
          waiver_continuous_waivers_behavior: state.waiverSettings.continuousWaiversBehavior,
          waiver_free_agent_unlock_behavior: state.waiverSettings.freeAgentUnlockBehavior,
          waiver_game_lock_behavior: state.waiverSettings.gameLockBehavior,
          waiver_drop_lock_behavior: state.waiverSettings.dropLockBehavior,
          waiver_same_day_add_drop_rules: state.waiverSettings.sameDayAddDropRules,
          waiver_max_claims_per_period: state.waiverSettings.maxClaimsPerPeriod,
          playoff_team_count: state.playoffSettings.playoffTeamCount,
          playoff_structure: {
            playoff_team_count: state.playoffSettings.playoffTeamCount,
            playoff_weeks: state.playoffSettings.playoffWeeks,
            playoff_start_week: state.playoffSettings.playoffStartWeek,
            playoff_start_point: state.playoffSettings.playoffStartWeek,
            first_round_byes: state.playoffSettings.firstRoundByes,
            seeding_rules: state.playoffSettings.seedingRules,
            tiebreaker_rules: state.playoffSettings.tiebreakerRules,
            bye_rules: state.playoffSettings.byeRules,
            matchup_length: state.playoffSettings.matchupLength,
            total_rounds: state.playoffSettings.totalRounds,
            consolation_bracket_enabled: state.playoffSettings.consolationBracketEnabled,
            third_place_game_enabled: state.playoffSettings.thirdPlaceGameEnabled,
            toilet_bowl_enabled: state.playoffSettings.toiletBowlEnabled,
            championship_length: state.playoffSettings.championshipLength,
            consolation_plays_for: state.playoffSettings.consolationPlaysFor,
            reseed_behavior: state.playoffSettings.reseedBehavior,
          },
          standings_tiebreakers: state.playoffSettings.tiebreakerRules,
          schedule_unit: state.scheduleSettings.scheduleUnit,
          regular_season_length: state.scheduleSettings.regularSeasonLength,
          matchup_frequency: state.scheduleSettings.matchupFrequency,
          schedule_cadence: state.scheduleSettings.matchupCadence,
          schedule_head_to_head_behavior: state.scheduleSettings.headToHeadOrPointsBehavior,
          lock_time_behavior: state.scheduleSettings.lockTimeBehavior,
          schedule_lock_window_behavior: state.scheduleSettings.lockWindowBehavior,
          schedule_scoring_period_behavior: state.scheduleSettings.scoringPeriodBehavior,
          schedule_reschedule_handling: state.scheduleSettings.rescheduleHandling,
          schedule_doubleheader_handling: state.scheduleSettings.doubleheaderOrMultiGameHandling,
          schedule_playoff_transition_point: state.scheduleSettings.playoffTransitionPoint,
          schedule_generation_strategy: state.scheduleSettings.scheduleGenerationStrategy,
          auction_budget_per_team: state.draftSettings.auctionBudgetPerTeam,
          keeper_max_keepers: state.draftSettings.keeperMaxKeepers,
          devy_rounds: devyRounds,
          c2c_college_rounds: c2cCollegeRounds,
          c2c_startup_mode: state.draftSettings.c2cStartupMode ?? 'merged',
          c2c_standings_model: state.draftSettings.c2cStandingsModel ?? 'unified',
          c2c_best_ball_pro: state.draftSettings.c2cBestBallPro ?? true,
          c2c_best_ball_college: state.draftSettings.c2cBestBallCollege ?? false,
          c2c_college_roster_size: state.draftSettings.c2cCollegeRosterSize ?? 20,
          c2c_rookie_draft_rounds: state.draftSettings.c2cRookieDraftRounds ?? 4,
          c2c_college_draft_rounds: state.draftSettings.c2cCollegeDraftRounds ?? 6,
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

  useEffect(() => {
    if (!creationPreset?.waiver) return
    const key = `${state.sport}|${state.leagueVariant ?? state.scoringPreset ?? ''}`
    if (skipInitialWaiverPresetSyncRef.current) {
      skipInitialWaiverPresetSyncRef.current = false
      lastWaiverPresetKeyRef.current = key
      return
    }
    if (waiverManualOverrideKeyRef.current === key) {
      lastWaiverPresetKeyRef.current = key
      return
    }
    if (lastWaiverPresetKeyRef.current === key) return
    setState((s) => ({ ...s, waiverSettings: toWizardWaiverSettings(creationPreset.waiver) }))
    lastWaiverPresetKeyRef.current = key
  }, [creationPreset?.waiver, state.sport, state.leagueVariant, state.scoringPreset])

  useEffect(() => {
    if (!creationPreset?.defaultLeagueSettings) return
    const key = `${state.sport}|${state.leagueVariant ?? state.scoringPreset ?? ''}`
    if (skipInitialPlayoffPresetSyncRef.current) {
      skipInitialPlayoffPresetSyncRef.current = false
      lastPlayoffPresetKeyRef.current = key
      return
    }
    if (playoffManualOverrideKeyRef.current === key) {
      lastPlayoffPresetKeyRef.current = key
      return
    }
    if (lastPlayoffPresetKeyRef.current === key) return
    setState((s) => ({
      ...s,
      playoffSettings: toWizardPlayoffSettings(
        creationPreset.defaultLeagueSettings as Record<string, unknown>,
        creationPreset.league?.default_playoff_team_count
      ),
    }))
    lastPlayoffPresetKeyRef.current = key
  }, [creationPreset?.defaultLeagueSettings, creationPreset?.league?.default_playoff_team_count, state.sport, state.leagueVariant, state.scoringPreset])

  useEffect(() => {
    if (!creationPreset?.defaultLeagueSettings) return
    const key = `${state.sport}|${state.leagueVariant ?? state.scoringPreset ?? ''}`
    if (skipInitialSchedulePresetSyncRef.current) {
      skipInitialSchedulePresetSyncRef.current = false
      lastSchedulePresetKeyRef.current = key
      return
    }
    if (scheduleManualOverrideKeyRef.current === key) {
      lastSchedulePresetKeyRef.current = key
      return
    }
    if (lastSchedulePresetKeyRef.current === key) return
    setState((s) => ({
      ...s,
      scheduleSettings: toWizardScheduleSettings(
        creationPreset.defaultLeagueSettings as Record<string, unknown>
      ),
    }))
    lastSchedulePresetKeyRef.current = key
  }, [creationPreset?.defaultLeagueSettings, state.sport, state.leagueVariant, state.scoringPreset])

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
              {creationPreset && <SportSummaryCard preset={creationPreset} />}
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
              <div className="space-y-4">
                <ScoringPresetSelector
                  sport={state.sport}
                  value={state.scoringPreset ?? state.leagueVariant}
                  onChange={handleScoringChange}
                />
                <LeagueSettingsPreviewPanel
                  preset={creationPreset}
                  sport={String(state.sport)}
                  presetLabel={getVariantsForSport(state.sport).find((v) => v.value === (state.scoringPreset ?? state.leagueVariant ?? ''))?.label}
                />
              </div>
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
          {state.step === 'waiver_settings' && (
            <>
              <WaiverSettingsPanel
                sport={String(state.sport)}
                leagueVariant={state.leagueVariant}
                waiverSettings={state.waiverSettings}
                onWaiverSettingsChange={handleWaiverSettingsChange}
              />
              <WizardStepNav onBack={goBack} onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'playoff_settings' && (
            <>
              <PlayoffSettingsPanel
                sport={String(state.sport)}
                leagueVariant={state.leagueVariant}
                playoffSettings={state.playoffSettings}
                onPlayoffSettingsChange={handlePlayoffSettingsChange}
              />
              <WizardStepNav onBack={goBack} onNext={goNext} nextLabel="Next" />
            </>
          )}
          {state.step === 'schedule_settings' && (
            <>
              <ScheduleSettingsPanel
                sport={String(state.sport)}
                leagueVariant={state.leagueVariant}
                scheduleSettings={state.scheduleSettings}
                onScheduleSettingsChange={handleScheduleSettingsChange}
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

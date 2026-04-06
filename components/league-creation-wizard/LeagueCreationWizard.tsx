'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
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
  DEFAULT_COMMISSIONER_PREFERENCES,
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
  WizardCommissionerPreferences,
  PlatformStyleMirror,
} from '@/lib/league-creation-wizard/types'
import { getConceptIntroVideoUrl } from '@/lib/league-creation/concept-intro-videos'
import { LeagueCreatedIntroModal } from './LeagueCreatedIntroModal'
import { LeagueSourceSection, type LeagueListRow } from './LeagueSourceSection'
import { PlatformStyleSelector } from './PlatformStyleSelector'
import { clampTeamCountForSport } from '@/lib/league-creation-wizard/sport-team-limits'
import { useSportPreset } from '@/hooks/useSportPreset'
import { useEntitlement } from '@/hooks/useEntitlement'
import {
  getAllowedLeagueTypesForSport,
  getAllowedDraftTypesForLeagueType,
  isDraftTypeAllowedForLeagueType,
  isDynastyLeagueType,
  isLeagueTypeAllowedForSport,
} from '@/lib/league-creation-wizard/league-type-registry'
import { WizardStepContainer } from './WizardStepContainer'
import { WizardStepNav } from './WizardStepNav'
import { SportSelector } from './SportSelector'
import { LeagueTypeSelector } from './LeagueTypeSelector'
import { DraftTypeSelector } from './DraftTypeSelector'
import { TeamSizeSelector } from './TeamSizeSelector'
import { AiAutomationSettingsPanel } from './AiAutomationSettingsPanel'
import { LeagueSettingsPreviewPanel } from '@/components/league-creation'
import { getVariantsForSport } from '@/lib/sport-defaults/LeagueVariantRegistry'
import {
  getLeagueVariantLabel,
  resolveCreationVariantOrDefault,
  resolveEffectiveLeagueVariant,
} from '@/lib/league-creation/LeagueVariantResolver'
import { emitLeagueCreationPerf } from '@/lib/league-creation/perf'

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
    <div className="min-h-[140px] flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/60 text-sm" aria-hidden>
      Loading…
    </div>
  )
}

type ActiveWizardStepId = (typeof WIZARD_STEP_ORDER)[number]

const STEP_LABELS: Record<ActiveWizardStepId, string> = {
  sport: 'Sport & setup',
  team_setup: 'League details',
  scoring: 'Scoring & rosters',
  draft_privacy: 'Draft, AI & privacy',
  review: 'Review & create',
}

const initialState: LeagueCreationWizardState = {
  step: 'sport',
  setupSource: 'fresh',
  copyFromLeagueId: null,
  leagueTimezone: 'America/New_York',
  platformStyleMirror: 'af',
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
  tradeReviewMode: 'commissioner',
  aiSettings: { ...DEFAULT_AI_SETTINGS },
  automationSettings: { ...DEFAULT_AUTOMATION_SETTINGS },
  commissionerPreferences: { ...DEFAULT_COMMISSIONER_PREFERENCES },
  privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
  templateSettingsOverrides: {},
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
    merged.setupSource = initialWizardState?.setupSource ?? 'fresh'
    merged.copyFromLeagueId = initialWizardState?.copyFromLeagueId ?? null
    merged.leagueTimezone = initialWizardState?.leagueTimezone ?? 'America/New_York'
    merged.platformStyleMirror = initialWizardState?.platformStyleMirror ?? 'af'
    merged.commissionerPreferences = {
      ...DEFAULT_COMMISSIONER_PREFERENCES,
      ...(initialWizardState?.commissionerPreferences ?? {}),
    }
    return merged
  })
  const { featureAccess: commissionerPlanUnlocked } = useEntitlement('commissioner_automation')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [postCreateIntro, setPostCreateIntro] = useState<{
    leagueId: string
    name: string
    videoUrl?: string
  } | null>(null)
  const [showAdvancedScoringRules, setShowAdvancedScoringRules] = useState(false)
  const skipInitialWaiverPresetSyncRef = useRef(Boolean(initialWizardState?.waiverSettings))
  const lastWaiverPresetKeyRef = useRef<string | null>(null)
  const waiverManualOverrideKeyRef = useRef<string | null>(null)
  const skipInitialPlayoffPresetSyncRef = useRef(Boolean(initialWizardState?.playoffSettings))
  const lastPlayoffPresetKeyRef = useRef<string | null>(null)
  const playoffManualOverrideKeyRef = useRef<string | null>(null)
  const skipInitialSchedulePresetSyncRef = useRef(Boolean(initialWizardState?.scheduleSettings))
  const lastSchedulePresetKeyRef = useRef<string | null>(null)
  const scheduleManualOverrideKeyRef = useRef<string | null>(null)
  const skipInitialTeamPresetSyncRef = useRef(Boolean(initialWizardState?.teamCount))
  const lastTeamPresetKeyRef = useRef<string | null>(null)
  const teamManualOverrideKeyRef = useRef<string | null>(null)
  const skipInitialLeagueNamePresetSyncRef = useRef(Boolean(initialWizardState?.name))
  const lastLeagueNamePresetKeyRef = useRef<string | null>(null)
  const leagueNameManualOverrideKeyRef = useRef<string | null>(null)
  const skipInitialTradeReviewPresetSyncRef = useRef(Boolean(initialWizardState?.tradeReviewMode))
  const lastTradeReviewPresetKeyRef = useRef<string | null>(null)
  const tradeReviewManualOverrideRef = useRef(Boolean(initialWizardState?.tradeReviewMode))
  const previousStepRef = useRef<WizardStepId | null>(null)
  const stepEnteredAtRef = useRef<number>(0)
  const wizardFlowStartedAtRef = useRef<number>(0)
  const effectiveVariantResult = useMemo(
    () =>
      resolveEffectiveLeagueVariant({
        sport: state.sport,
        leagueType: state.leagueType,
        requestedVariant: state.leagueVariant ?? state.scoringPreset ?? null,
      }),
    [state.sport, state.leagueType, state.leagueVariant, state.scoringPreset]
  )
  const effectiveLeagueVariant = effectiveVariantResult.variant ?? 'STANDARD'
  const variantLockedByLeagueType = effectiveVariantResult.variantLockedByLeagueType
  const effectiveVariantLabel = getLeagueVariantLabel(effectiveLeagueVariant)

  const {
    preset: creationPreset,
    loading: creationPresetLoading,
    error: creationPresetError,
  } = useSportPreset(state.sport as any, effectiveLeagueVariant)
  const stepIndex = (WIZARD_STEP_ORDER as readonly WizardStepId[]).indexOf(state.step)
  const currentStepNumber = stepIndex + 1
  const totalSteps = WIZARD_STEP_ORDER.length
  const stepLabel =
    state.step in STEP_LABELS
      ? STEP_LABELS[state.step as ActiveWizardStepId]
      : STEP_LABELS.sport
  const stepValidationError = useMemo(() => {
    if (state.step === 'sport') {
      if (!isLeagueTypeAllowedForSport(state.leagueType, state.sport)) {
        return 'League format is not valid for this sport.'
      }
      if (!isDraftTypeAllowedForLeagueType(state.draftType, state.leagueType)) {
        return 'Draft style is not valid for the selected format.'
      }
      if (state.setupSource === 'copy_league' && !state.copyFromLeagueId) {
        return 'Pick an AllFantasy league to copy settings from, or choose a different starting option.'
      }
      return null
    }
    if (state.step === 'team_setup') {
      if (!state.name.trim()) {
        return 'Enter a league name.'
      }
      if (!state.leagueTimezone?.trim()) {
        return 'Select a league timezone.'
      }
      return null
    }
    if (state.step === 'draft_privacy') {
      if (state.draftType === 'auction' && (state.draftSettings.auctionBudgetPerTeam ?? 0) <= 0) {
        return 'Auction leagues require a positive budget per team.'
      }
      if (state.leagueType === 'keeper' && (state.draftSettings.keeperMaxKeepers ?? 0) <= 0) {
        return 'Keeper leagues require at least 1 keeper slot.'
      }
      if (state.leagueType === 'devy' && state.draftSettings.devyRounds.length === 0) {
        return 'Devy leagues require at least one devy round.'
      }
      if (state.leagueType === 'c2c' && state.draftSettings.c2cCollegeRounds.length === 0) {
        return 'C2C leagues require at least one college round.'
      }
      return null
    }
    return null
  }, [
    state.step,
    state.leagueType,
    state.draftType,
    state.sport,
    state.setupSource,
    state.copyFromLeagueId,
    state.name,
    state.leagueTimezone,
    state.draftSettings.auctionBudgetPerTeam,
    state.draftSettings.keeperMaxKeepers,
    state.draftSettings.devyRounds,
    state.draftSettings.c2cCollegeRounds,
  ])

  const go = useCallback((step: WizardStepId) => {
    setState((s) => ({ ...s, step }))
    setError(null)
  }, [])

  const goNext = useCallback(() => {
    if (stepValidationError) {
      emitLeagueCreationPerf('wizard_next_blocked_validation', {
        step: state.step,
        message: stepValidationError,
      })
      return
    }
    const idx = (WIZARD_STEP_ORDER as readonly WizardStepId[]).indexOf(state.step)
    if (idx < WIZARD_STEP_ORDER.length - 1) go(WIZARD_STEP_ORDER[idx + 1]!)
    else go('review')
  }, [state.step, go, stepValidationError])

  const goBack = useCallback(() => {
    const idx = (WIZARD_STEP_ORDER as readonly WizardStepId[]).indexOf(state.step)
    if (idx > 0) go(WIZARD_STEP_ORDER[idx - 1]!)
  }, [state.step, go])

  const handleSportChange = useCallback((sport: string) => {
    setState((s) => {
      const allowed = getAllowedLeagueTypesForSport(sport)
      const leagueType = allowed.includes(s.leagueType) ? s.leagueType : (allowed[0] ?? 'redraft')
      const draftAllowed = getAllowedDraftTypesForLeagueType(leagueType)
      const draftType = draftAllowed.includes(s.draftType) ? s.draftType : (draftAllowed[0] ?? 'snake')
      const variants = getVariantsForSport(sport)
      const fallbackVariant = variants[0]?.value ?? 'STANDARD'
      const resolvedVariant =
        resolveEffectiveLeagueVariant({
          sport,
          leagueType,
          requestedVariant: s.leagueVariant ?? s.scoringPreset ?? fallbackVariant,
        }).variant ?? fallbackVariant
      const nextTeam = clampTeamCountForSport(sport, s.teamCount)
      return {
        ...s,
        sport,
        leagueType,
        draftType,
        teamCount: nextTeam,
        leagueVariant: resolvedVariant,
        scoringPreset: resolvedVariant,
      }
    })
  }, [])

  const handleLeagueTypeChange = useCallback((leagueType: LeagueTypeId) => {
    setState((s) => {
      const draftAllowed = getAllowedDraftTypesForLeagueType(leagueType)
      const draftType = draftAllowed.includes(s.draftType) ? s.draftType : (draftAllowed[0] ?? 'snake')
      const resolvedVariant =
        resolveEffectiveLeagueVariant({
          sport: s.sport,
          leagueType,
          requestedVariant: s.leagueVariant ?? s.scoringPreset ?? null,
        }).variant ?? 'STANDARD'
      return { ...s, leagueType, draftType, leagueVariant: resolvedVariant, scoringPreset: resolvedVariant }
    })
  }, [])

  const handleDraftTypeChange = useCallback((d: DraftTypeId) => {
    setState((s) => ({ ...s, draftType: d }))
  }, [])

  const handleNameChange = useCallback((n: string) => {
    setState((s) => {
      const key = `${s.sport}|${s.leagueVariant ?? s.scoringPreset ?? ''}`
      leagueNameManualOverrideKeyRef.current = key
      return { ...s, name: n }
    })
  }, [])
  const handleTeamCountChange = useCallback((n: number) => {
    setState((s) => {
      const key = `${s.sport}|${s.leagueVariant ?? s.scoringPreset ?? ''}`
      teamManualOverrideKeyRef.current = key
      return { ...s, teamCount: clampTeamCountForSport(String(s.sport), n) }
    })
  }, [])
  const handleRosterSizeChange = useCallback((n: number | null) => setState((s) => ({ ...s, rosterSize: n })), [])
  const handleTradeReviewModeChange = useCallback((mode: LeagueCreationWizardState['tradeReviewMode']) => {
    setState((s) => {
      tradeReviewManualOverrideRef.current = true
      return { ...s, tradeReviewMode: mode }
    })
  }, [])

  const handleScoringChange = useCallback((v: string | null) => {
    setState((s) => {
      const resolvedVariant =
        resolveEffectiveLeagueVariant({
          sport: s.sport,
          leagueType: s.leagueType,
          requestedVariant: v,
        }).variant ?? 'STANDARD'
      return { ...s, scoringPreset: resolvedVariant, leagueVariant: resolvedVariant }
    })
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

  const handleCommissionerPreferencesChange = useCallback(
    (patch: Partial<WizardCommissionerPreferences>) => {
      setState((s) => ({
        ...s,
        commissionerPreferences: { ...s.commissionerPreferences, ...patch },
      }))
    },
    []
  )

  const handlePrivacyChange = useCallback((patch: Partial<WizardPrivacySettings>) => {
    setState((s) => ({ ...s, privacySettings: { ...s.privacySettings, ...patch } }))
  }, [])

  const handleSetupSourceChange = useCallback((source: LeagueCreationWizardState['setupSource']) => {
    setState((s) => ({
      ...s,
      setupSource: source,
      copyFromLeagueId: source !== 'copy_league' ? null : s.copyFromLeagueId,
    }))
  }, [])

  const handleCopyLeagueApply = useCallback((league: LeagueListRow) => {
    const sp = String(league.sport ?? '').trim() || 'NFL'
    setState((s) => {
      const nextTeam = clampTeamCountForSport(sp, league.leagueSize ?? s.teamCount)
      const overrides =
        league.settings && typeof league.settings === 'object' && !Array.isArray(league.settings)
          ? { ...(league.settings as Record<string, unknown>) }
          : {}
      return {
        ...s,
        setupSource: 'copy_league',
        copyFromLeagueId: league.id,
        sport: sp,
        teamCount: nextTeam,
        templateSettingsOverrides: overrides,
        name: s.name.trim().length > 0 ? s.name : `Copy of ${(league.name ?? 'League').trim()}`,
      }
    })
  }, [])

  const handleTimezoneChange = useCallback((tz: string) => {
    setState((s) => ({ ...s, leagueTimezone: tz }))
  }, [])

  const handlePlatformStyleMirrorChange = useCallback((style: PlatformStyleMirror) => {
    setState((s) => ({ ...s, platformStyleMirror: style }))
  }, [])

  const handleCreate = useCallback(async () => {
    const createRequestStart = typeof performance !== 'undefined' ? performance.now() : Date.now()
    emitLeagueCreationPerf('wizard_create_submit', {
      sport: state.sport,
      leagueType: state.leagueType,
      draftType: state.draftType,
      teamCount: state.teamCount,
    })
    setCreating(true)
    setError(null)
    try {
      const isDynasty = isDynastyLeagueType(state.leagueType)
      const leagueVariant = resolveCreationVariantOrDefault({
        sport: state.sport,
        leagueType: state.leagueType,
        requestedVariant: state.leagueVariant ?? state.scoringPreset ?? null,
      })
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
      const defaultCollegeSport = state.sport === 'NBA' || state.sport === 'NCAAB' ? 'NCAAB' : 'NCAAF'
      const devyCollegeSports =
        state.draftSettings.devyCollegeSports?.length
          ? state.draftSettings.devyCollegeSports
          : [defaultCollegeSport]
      const c2cCollegeSports =
        state.draftSettings.c2cCollegeSports?.length
          ? state.draftSettings.c2cCollegeSports
          : [defaultCollegeSport]
      const presetScoringTemplate = creationPreset?.scoringTemplate
      const introUrl = getConceptIntroVideoUrl(String(state.sport))
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
        ...(introUrl
          ? { introVideo: { url: introUrl, kind: 'concept_welcome' as const } }
          : {}),
        settings: {
          ...(state.templateSettingsOverrides ?? {}),
          league_size: state.teamCount,
          roster_size: state.rosterSize,
          league_type: state.leagueType,
          draft_type: state.draftType,
          league_timezone: state.leagueTimezone,
          scoring_format: presetScoringTemplate?.formatType ?? undefined,
          scoring_template_id: presetScoringTemplate?.templateId ?? undefined,
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
          trade_review_mode: state.tradeReviewMode,
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
          special_draft_type: state.draftType,
          keeper_max_keepers: state.draftSettings.keeperMaxKeepers,
          devy_rounds: devyRounds,
          devy_slot_count: state.draftSettings.devySlotCount ?? 12,
          devy_ir_slots: state.draftSettings.devyIrSlots ?? 2,
          devy_taxi_slots: state.draftSettings.devyTaxiSlots ?? 6,
          devy_college_sports: devyCollegeSports,
          c2c_college_rounds: c2cCollegeRounds,
          c2c_college_sports: c2cCollegeSports,
          c2c_startup_mode: state.draftSettings.c2cStartupMode ?? 'merged',
          c2c_standings_model: state.draftSettings.c2cStandingsModel ?? 'unified',
          c2c_best_ball_pro: state.draftSettings.c2cBestBallPro ?? true,
          c2c_best_ball_college: state.draftSettings.c2cBestBallCollege ?? false,
          c2c_college_roster_size: state.draftSettings.c2cCollegeRosterSize ?? 20,
          c2c_rookie_draft_rounds: state.draftSettings.c2cRookieDraftRounds ?? 4,
          c2c_college_draft_rounds: state.draftSettings.c2cCollegeDraftRounds ?? 6,
          c2c_scoring_system: state.draftSettings.c2cScoringSystem ?? 'ppr',
          c2c_mix_pro_players: state.draftSettings.c2cMixProPlayers ?? true,
          ai_adp_enabled: state.aiSettings.aiAdpEnabled,
          orphan_team_ai_manager_enabled: state.aiSettings.orphanTeamAiManagerEnabled,
          draft_helper_enabled: state.aiSettings.draftHelperEnabled,
          creation_commissioner_preferences: commissionerPlanUnlocked
            ? state.commissionerPreferences
            : { ...DEFAULT_COMMISSIONER_PREFERENCES },
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
      emitLeagueCreationPerf('wizard_create_response', {
        ok: res.ok,
        status: res.status,
        durationMs: Number(
          ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - createRequestStart).toFixed(1)
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Failed to create league')
        return
      }
      const leagueId = data.league?.id
      if (leagueId) {
        onSuccess?.(leagueId)
        setPostCreateIntro({ leagueId, name, videoUrl: introUrl })
      } else {
        setError('League created but no ID returned')
      }
    } catch (e) {
      emitLeagueCreationPerf('wizard_create_error', {
        message: (e as Error).message ?? 'Request failed',
        durationMs: Number(
          ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - createRequestStart).toFixed(1)
        ),
      })
      setError((e as Error).message ?? 'Request failed')
    } finally {
      setCreating(false)
    }
  }, [state, onSuccess, creationPreset?.scoringTemplate, commissionerPlanUnlocked])

  useEffect(() => {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    wizardFlowStartedAtRef.current = startedAt
    stepEnteredAtRef.current = startedAt
    previousStepRef.current = state.step
    emitLeagueCreationPerf('wizard_open', {
      initialStep: state.step,
      sport: state.sport,
      leagueType: state.leagueType,
      draftType: state.draftType,
    })
    return () => {
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
      emitLeagueCreationPerf('wizard_close', {
        totalFlowMs: Number((endedAt - wizardFlowStartedAtRef.current).toFixed(1)),
      })
    }
    // Run once per wizard mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const previousStep = previousStepRef.current
    if (previousStep && previousStep !== state.step) {
      emitLeagueCreationPerf('wizard_step_duration', {
        step: previousStep,
        durationMs: Number((now - stepEnteredAtRef.current).toFixed(1)),
      })
      emitLeagueCreationPerf('wizard_step_enter', {
        step: state.step,
        fromStep: previousStep,
      })
      previousStepRef.current = state.step
      stepEnteredAtRef.current = now
    }
  }, [state.step])

  useEffect(() => {
    if (!creationPreset?.waiver) return
    const key = `${state.sport}|${state.leagueVariant ?? state.scoringPreset ?? ''}`
    if (skipInitialWaiverPresetSyncRef.current) {
      skipInitialWaiverPresetSyncRef.current = false
      lastWaiverPresetKeyRef.current = key
      return
    }
    if (
      waiverManualOverrideKeyRef.current === key &&
      lastWaiverPresetKeyRef.current === key
    ) {
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
    if (
      playoffManualOverrideKeyRef.current === key &&
      lastPlayoffPresetKeyRef.current === key
    ) {
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
    if (
      scheduleManualOverrideKeyRef.current === key &&
      lastSchedulePresetKeyRef.current === key
    ) {
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

  useEffect(() => {
    const defaultTeamCount = creationPreset?.league?.default_team_count
    if (typeof defaultTeamCount !== 'number' || !Number.isFinite(defaultTeamCount)) return
    const key = `${state.sport}|${state.leagueVariant ?? state.scoringPreset ?? ''}`
    if (skipInitialTeamPresetSyncRef.current) {
      skipInitialTeamPresetSyncRef.current = false
      lastTeamPresetKeyRef.current = key
      return
    }
    if (
      teamManualOverrideKeyRef.current === key &&
      lastTeamPresetKeyRef.current === key
    ) {
      lastTeamPresetKeyRef.current = key
      return
    }
    if (lastTeamPresetKeyRef.current === key) return
    setState((s) => ({ ...s, teamCount: defaultTeamCount }))
    lastTeamPresetKeyRef.current = key
  }, [creationPreset?.league?.default_team_count, state.sport, state.leagueVariant, state.scoringPreset])

  useEffect(() => {
    const defaultLeagueName = creationPreset?.league?.default_league_name_pattern
    if (!defaultLeagueName || typeof defaultLeagueName !== 'string') return
    const key = `${state.sport}|${state.leagueVariant ?? state.scoringPreset ?? ''}`
    if (skipInitialLeagueNamePresetSyncRef.current) {
      skipInitialLeagueNamePresetSyncRef.current = false
      lastLeagueNamePresetKeyRef.current = key
      return
    }
    if (
      leagueNameManualOverrideKeyRef.current === key &&
      lastLeagueNamePresetKeyRef.current === key
    ) {
      lastLeagueNamePresetKeyRef.current = key
      return
    }
    if (lastLeagueNamePresetKeyRef.current === key) return
    setState((s) => ({
      ...s,
      name: s.name.trim().length === 0 ? defaultLeagueName : s.name,
    }))
    lastLeagueNamePresetKeyRef.current = key
  }, [creationPreset?.league?.default_league_name_pattern, state.sport, state.leagueVariant, state.scoringPreset])

  useEffect(() => {
    const defaultLeagueSettings =
      creationPreset?.defaultLeagueSettings && typeof creationPreset.defaultLeagueSettings === 'object'
        ? (creationPreset.defaultLeagueSettings as Record<string, unknown>)
        : null
    const tradeReviewMode = defaultLeagueSettings?.trade_review_mode
    if (typeof tradeReviewMode !== 'string' || tradeReviewMode.length === 0) return
    const key = `${state.sport}|${state.leagueVariant ?? state.scoringPreset ?? ''}`
    if (skipInitialTradeReviewPresetSyncRef.current) {
      skipInitialTradeReviewPresetSyncRef.current = false
      lastTradeReviewPresetKeyRef.current = key
      return
    }
    if (tradeReviewManualOverrideRef.current) {
      lastTradeReviewPresetKeyRef.current = key
      return
    }
    if (lastTradeReviewPresetKeyRef.current === key) return
    setState((s) => ({
      ...s,
      tradeReviewMode: tradeReviewMode as LeagueCreationWizardState['tradeReviewMode'],
    }))
    lastTradeReviewPresetKeyRef.current = key
  }, [creationPreset?.defaultLeagueSettings, state.sport, state.leagueVariant, state.scoringPreset])

  return (
    <div className="mx-auto w-full max-w-2xl px-2 sm:px-3 py-1 min-h-0 flex flex-col">
      <div className="rounded-[28px] border border-cyan-400/25 bg-[#050f29]/75 p-3 sm:p-5 shadow-[0_0_0_1px_rgba(0,255,220,0.06)_inset] backdrop-blur-sm flex flex-col min-h-0">
        <WizardStepContainer
          stepNumber={currentStepNumber}
          totalSteps={totalSteps}
          stepLabel={stepLabel}
        >
          {state.step === 'sport' && (
            <>
              <LeagueSourceSection
                setupSource={state.setupSource}
                copyFromLeagueId={state.copyFromLeagueId}
                currentSport={String(state.sport)}
                onSetupSourceChange={handleSetupSourceChange}
                onCopyLeagueApply={handleCopyLeagueApply}
              />
              <SportSelector value={state.sport} onChange={handleSportChange} />
              {creationPresetLoading && (
                <p
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65"
                  role="status"
                  data-testid="league-creation-template-loader"
                >
                  Loading default roster, scoring, draft, and schedule templates…
                </p>
              )}
              {creationPresetError && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Could not load sport defaults: {creationPresetError}
                </p>
              )}
              {creationPreset && <SportSummaryCard preset={creationPreset} />}
              <div className="mt-6 space-y-6 border-t border-white/10 pt-6">
                <LeagueTypeSelector
                  sport={state.sport}
                  value={state.leagueType}
                  onChange={handleLeagueTypeChange}
                />
                <DraftTypeSelector
                  sport={String(state.sport)}
                  leagueType={state.leagueType}
                  value={state.draftType}
                  onChange={handleDraftTypeChange}
                />
              </div>
              <WizardStepNav
                onNext={goNext}
                nextLabel="Next"
                disableForward={creationPresetLoading || Boolean(stepValidationError)}
                error={stepValidationError}
              />
            </>
          )}
          {state.step === 'team_setup' && (
            <>
              <TeamSizeSelector
                sport={String(state.sport)}
                name={state.name}
                teamCount={state.teamCount}
                rosterSize={state.rosterSize}
                tradeReviewMode={state.tradeReviewMode}
                leagueTimezone={state.leagueTimezone}
                onNameChange={handleNameChange}
                onTeamCountChange={handleTeamCountChange}
                onRosterSizeChange={handleRosterSizeChange}
                onTradeReviewModeChange={handleTradeReviewModeChange}
                onTimezoneChange={handleTimezoneChange}
              />
              <WizardStepNav
                onBack={goBack}
                onNext={goNext}
                nextLabel="Next"
                disableForward={creationPresetLoading || Boolean(stepValidationError)}
                error={stepValidationError}
              />
            </>
          )}
          {state.step === 'scoring' && (
            <>
              <div className="space-y-4">
                <PlatformStyleSelector
                  sport={String(state.sport)}
                  value={state.platformStyleMirror}
                  onChange={handlePlatformStyleMirrorChange}
                  onResolvedVariant={(v) => handleScoringChange(v)}
                />
                <ScoringPresetSelector
                  sport={state.sport}
                  value={effectiveLeagueVariant}
                  onChange={handleScoringChange}
                  lockedVariantLabel={variantLockedByLeagueType ? effectiveVariantLabel : null}
                />
                <LeagueSettingsPreviewPanel
                  preset={creationPreset}
                  sport={String(state.sport)}
                  presetLabel={effectiveVariantLabel}
                  teamCountOverride={state.teamCount}
                  playoffTeamCountOverride={state.playoffSettings.playoffTeamCount}
                  regularSeasonLengthOverride={state.scheduleSettings.regularSeasonLength}
                  matchupUnitOverride={state.scheduleSettings.scheduleUnit}
                  tradeReviewModeOverride={state.tradeReviewMode}
                />
                {creationPresetLoading && (
                  <p className="text-xs text-white/55" role="status">
                    Refreshing preset templates for this sport and variant…
                  </p>
                )}
                <div className="rounded-2xl border border-white/10 bg-[#030b1f]/70 p-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedScoringRules((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-xl border border-cyan-400/25 bg-cyan-400/5 px-3 py-2 text-left text-sm font-semibold text-cyan-100 hover:bg-cyan-400/10"
                    aria-expanded={showAdvancedScoringRules}
                    data-testid="league-creation-advanced-scoring-toggle"
                  >
                    <span>Waivers, playoffs &amp; schedule</span>
                    <span className="text-xs text-cyan-200/80">
                      {showAdvancedScoringRules ? 'Hide' : 'Show'}
                    </span>
                  </button>
                  {!showAdvancedScoringRules && (
                    <p className="mt-2 text-xs text-white/60">
                      Optional — defaults follow your sport and scoring preset (ESPN-style). Full commissioner tools
                      stay in league settings after you create.
                    </p>
                  )}
                </div>
                {showAdvancedScoringRules && (
                  <div className="space-y-5">
                    <section
                      className="rounded-2xl border border-white/10 bg-black/25 p-3"
                      data-testid="league-creation-advanced-waiver"
                    >
                      <WaiverSettingsPanel
                        sport={String(state.sport)}
                        leagueVariant={state.leagueVariant}
                        waiverSettings={state.waiverSettings}
                        onWaiverSettingsChange={handleWaiverSettingsChange}
                      />
                    </section>
                    <section
                      className="rounded-2xl border border-white/10 bg-black/25 p-3"
                      data-testid="league-creation-advanced-playoff"
                    >
                      <PlayoffSettingsPanel
                        sport={String(state.sport)}
                        leagueVariant={state.leagueVariant}
                        playoffSettings={state.playoffSettings}
                        onPlayoffSettingsChange={handlePlayoffSettingsChange}
                      />
                    </section>
                    <section
                      className="rounded-2xl border border-white/10 bg-black/25 p-3"
                      data-testid="league-creation-advanced-schedule"
                    >
                      <ScheduleSettingsPanel
                        sport={String(state.sport)}
                        leagueVariant={state.leagueVariant}
                        scheduleSettings={state.scheduleSettings}
                        onScheduleSettingsChange={handleScheduleSettingsChange}
                      />
                    </section>
                  </div>
                )}
              </div>
              <WizardStepNav
                onBack={goBack}
                onNext={goNext}
                nextLabel="Next"
                disableForward={creationPresetLoading || Boolean(stepValidationError)}
                error={stepValidationError}
              />
            </>
          )}
          {state.step === 'draft_privacy' && (
            <>
              <DraftSettingsPanel
                leagueType={state.leagueType}
                draftType={state.draftType}
                draftSettings={state.draftSettings}
                onDraftSettingsChange={handleDraftSettingsChange}
              />
              <div className="mt-8">
                <AiAutomationSettingsPanel
                  sport={String(state.sport)}
                  aiSettings={state.aiSettings}
                  automationSettings={state.automationSettings}
                  commissionerPreferences={state.commissionerPreferences}
                  onAiChange={handleAiSettingsChange}
                  onAutomationChange={handleAutomationChange}
                  onCommissionerChange={handleCommissionerPreferencesChange}
                />
              </div>
              <div className="mt-8">
                <LeaguePrivacyPanel value={state.privacySettings} onChange={handlePrivacyChange} />
              </div>
              <WizardStepNav
                onBack={goBack}
                onNext={goNext}
                nextLabel="Next"
                disableForward={creationPresetLoading || Boolean(stepValidationError)}
                error={stepValidationError}
              />
            </>
          )}
          {state.step === 'review' && (
            <>
              <LeagueSummaryPanel state={state} creationPreset={creationPreset} />
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
                disableForward={creationPresetLoading}
                error={error}
              />
            </>
          )}
        </WizardStepContainer>
      </div>
      <LeagueCreatedIntroModal
        open={postCreateIntro != null}
        leagueName={postCreateIntro?.name ?? ''}
        videoUrl={postCreateIntro?.videoUrl}
        onEnterLeague={() => {
          const id = postCreateIntro?.leagueId
          setPostCreateIntro(null)
          if (id) router.push(`/league/${id}`)
        }}
      />
    </div>
  )
}

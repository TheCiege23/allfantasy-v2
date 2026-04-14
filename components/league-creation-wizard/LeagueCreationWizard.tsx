'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { PlatformStyleSelector } from './PlatformStyleSelector'
import { clampTeamCountForSport } from '@/lib/league-creation-wizard/sport-team-limits'
import { readFetchJson } from '@/lib/http/readFetchJson'
import { buildPostCreateLeagueHomeHref } from '@/lib/league/post-create-navigation'
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
import { TeamCountSelector, TeamSizeSelector } from './TeamSizeSelector'
import { AiAutomationSettingsPanel } from './AiAutomationSettingsPanel'
import { LeagueSettingsPreviewPanel } from '@/components/league-creation'
import { getVariantsForSport } from '@/lib/sport-defaults/LeagueVariantRegistry'
import {
  getLeagueVariantLabel,
  resolveCreationVariantOrDefault,
  resolveEffectiveLeagueVariant,
} from '@/lib/league-creation/LeagueVariantResolver'
import { emitLeagueCreationPerf } from '@/lib/league-creation/perf'
import {
  DEFAULT_WIZARD_FORMAT_OPTIONS,
  formatOptionsApplyToLeagueType,
  clampSurvivorTeamCount,
} from '@/lib/league-creation-wizard/wizard-format-options'
import { TOURNAMENT_PARTICIPANT_POOL_SIZES_EXTENDED } from '@/lib/tournament-mode/pool-sizes'
import { getFeederLeagueCountForPool } from '@/lib/tournament-mode/tournament-sport-cutoffs'
import type { WizardFormatOptions } from '@/lib/league-creation-wizard/wizard-format-options'
import { LeagueFormatOptionsPanel } from './LeagueFormatOptionsPanel'

/** Lazy-loaded step panels to shrink initial bundle and improve mobile TTI. */
const ScoringPresetSelector = dynamic(
  () => import('./ScoringPresetSelector').then((m) => ({ default: m.ScoringPresetSelector })),
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

const WIZARD_STORAGE_KEY = 'af:create-league:wizard-state'

type ActiveWizardStepId = (typeof WIZARD_STEP_ORDER)[number]

const STEP_LABELS: Record<ActiveWizardStepId, string> = {
  sport: 'Sport & setup',
  team_setup: 'League details',
  scoring: 'Scoring & rosters',
  draft_privacy: 'AI & privacy',
  review: 'Review & create',
}

function mapWizardVisibilityToStoredPrivacy(
  v: WizardPrivacySettings['visibility']
): 'public' | 'private' | 'invite_only' {
  if (v === 'unlisted') return 'invite_only'
  return v === 'public' ? 'public' : 'private'
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
  formatOptions: { ...DEFAULT_WIZARD_FORMAT_OPTIONS },
  templateSettingsOverrides: {},
}

function mapDraftTypeToTournamentDraft(d: DraftTypeId): 'snake' | 'auction' {
  if (d === 'auction' || d === 'devy_auction' || d === 'c2c_auction') return 'auction'
  return 'snake'
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
  /** Open on a specific step (`/create-league?step=scoring`). */
  initialStep?: WizardStepId
}

export function LeagueCreationWizard({
  onSuccess,
  initialWizardState,
  onSaveAsTemplate,
  savingTemplate = false,
  initialStep,
}: LeagueCreationWizardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<LeagueCreationWizardState>(() => {
    const storedState = (() => {
      if (typeof window === 'undefined') return null
      try {
        const raw = window.sessionStorage.getItem(WIZARD_STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<LeagueCreationWizardState>
        return parsed && typeof parsed === 'object' ? parsed : null
      } catch {
        return null
      }
    })()
    const merged = { ...initialState, ...(storedState ?? {}), ...(initialWizardState ?? {}) }
    const fromUrl =
      initialStep && (WIZARD_STEP_ORDER as readonly string[]).includes(initialStep) ? initialStep : null
    // Fresh visits to `/create-league` (no `?step=`) must start at step 1. Session still restores
    // name, sport, etc., but must not skip ahead to a later step.
    merged.step = fromUrl ?? 'sport'
    merged.setupSource = initialWizardState?.setupSource ?? 'fresh'
    merged.copyFromLeagueId = initialWizardState?.copyFromLeagueId ?? null
    merged.leagueTimezone = initialWizardState?.leagueTimezone ?? 'America/New_York'
    merged.platformStyleMirror = initialWizardState?.platformStyleMirror ?? 'af'
    merged.commissionerPreferences = {
      ...DEFAULT_COMMISSIONER_PREFERENCES,
      ...(initialWizardState?.commissionerPreferences ?? {}),
    }
    merged.formatOptions = {
      ...DEFAULT_WIZARD_FORMAT_OPTIONS,
      ...(initialWizardState?.formatOptions ?? {}),
    }
    return merged
  })
  const { featureAccess: commissionerPlanUnlocked } = useEntitlement('commissioner_automation')
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
      return null
    }
    return null
  }, [
    state.step,
    state.leagueType,
    state.draftType,
    state.sport,
    state.name,
    state.leagueTimezone,
  ])

  const buildStepHref = useCallback(
    (step: WizardStepId, returnToReview = false) => {
      const nextParams = new URLSearchParams(searchParams?.toString() ?? '')
      nextParams.set('step', step)
      if (returnToReview) nextParams.set('returnTo', 'review')
      else nextParams.delete('returnTo')
      return `/create-league?${nextParams.toString()}`
    },
    [searchParams]
  )

  const go = useCallback((step: WizardStepId, options?: { returnToReview?: boolean }) => {
    setState((s) => ({ ...s, step }))
    setError(null)
    router.push(buildStepHref(step, options?.returnToReview === true), { scroll: false })
  }, [buildStepHref, router])

  const handleEditStep = useCallback(
    (stepId: WizardStepId) => {
      go(stepId, { returnToReview: true })
    },
    [go]
  )

  useEffect(() => {
    const stepParam = searchParams?.get('step')
    if (!stepParam) return
    if (!(WIZARD_STEP_ORDER as readonly string[]).includes(stepParam)) return
    setState((s) => (s.step === stepParam ? s : { ...s, step: stepParam as WizardStepId }))
  }, [searchParams])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [state.step])

  useEffect(() => {
    if (state.leagueType !== 'survivor') return
    const tc = clampTeamCountForSport(String(state.sport), state.teamCount, 'survivor')
    setState((s) => {
      if (s.formatOptions.survivorTeamCount === tc) return s
      return { ...s, formatOptions: { ...s.formatOptions, survivorTeamCount: tc } }
    })
  }, [state.leagueType, state.sport, state.teamCount])

  useEffect(() => {
    if (state.leagueType !== 'tournament') return
    const p = state.formatOptions.tournamentParticipantPoolSize
    const allowed = TOURNAMENT_PARTICIPANT_POOL_SIZES_EXTENDED as readonly number[]
    if (allowed.includes(p)) return
    const nearest = allowed.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a))
    setState((s) => ({
      ...s,
      formatOptions: {
        ...s.formatOptions,
        tournamentParticipantPoolSize: nearest,
        tournamentInitialLeagueSize: 12,
      },
    }))
  }, [state.leagueType, state.formatOptions.tournamentParticipantPoolSize])

  const goNext = useCallback(() => {
    if (stepValidationError) {
      emitLeagueCreationPerf('wizard_next_blocked_validation', {
        step: state.step,
        message: stepValidationError,
      })
      return
    }
    if (searchParams?.get('returnTo') === 'review') {
      go('review')
      return
    }
    const idx = (WIZARD_STEP_ORDER as readonly WizardStepId[]).indexOf(state.step)
    if (idx < WIZARD_STEP_ORDER.length - 1) go(WIZARD_STEP_ORDER[idx + 1]!)
    else go('review')
  }, [searchParams, state.step, go, stepValidationError])

  const goBack = useCallback(() => {
    const idx = (WIZARD_STEP_ORDER as readonly WizardStepId[]).indexOf(state.step)
    if (idx > 0) {
      go(WIZARD_STEP_ORDER[idx - 1]!)
      return
    }
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(WIZARD_STORAGE_KEY)
    }
    setState({
      ...initialState,
      commissionerPreferences: { ...DEFAULT_COMMISSIONER_PREFERENCES },
      formatOptions: { ...DEFAULT_WIZARD_FORMAT_OPTIONS },
      draftSettings: { ...DEFAULT_DRAFT_SETTINGS },
      waiverSettings: { ...DEFAULT_WAIVER_SETTINGS },
      playoffSettings: { ...DEFAULT_PLAYOFF_SETTINGS },
      scheduleSettings: { ...DEFAULT_SCHEDULE_SETTINGS },
      aiSettings: { ...DEFAULT_AI_SETTINGS },
      automationSettings: { ...DEFAULT_AUTOMATION_SETTINGS },
      privacySettings: { ...DEFAULT_PRIVACY_SETTINGS },
      step: 'sport',
    })
    router.push('/dashboard')
  }, [state.step, go, router])

  const handleSportChange = useCallback((sport: string) => {
    setState((s) => {
      const allowed = getAllowedLeagueTypesForSport(sport)
      const leagueType = allowed.includes(s.leagueType) ? s.leagueType : (allowed[0] ?? 'redraft')
      const draftAllowed = getAllowedDraftTypesForLeagueType(leagueType, sport)
      const draftType = draftAllowed.includes(s.draftType) ? s.draftType : (draftAllowed[0] ?? 'snake')
      const variants = getVariantsForSport(sport)
      const fallbackVariant = variants[0]?.value ?? 'STANDARD'
      const resolvedVariant =
        resolveEffectiveLeagueVariant({
          sport,
          leagueType,
          requestedVariant: s.leagueVariant ?? s.scoringPreset ?? fallbackVariant,
        }).variant ?? fallbackVariant
      const nextTeam = clampTeamCountForSport(sport, s.teamCount, leagueType)
      return {
        ...s,
        sport,
        leagueType,
        draftType,
        teamCount: nextTeam,
        leagueVariant: resolvedVariant,
        scoringPreset: resolvedVariant,
        formatOptions:
          leagueType === 'survivor'
            ? { ...s.formatOptions, survivorTeamCount: nextTeam }
            : s.formatOptions,
      }
    })
  }, [])

  const handleLeagueTypeChange = useCallback((leagueType: LeagueTypeId) => {
    setState((s) => {
      const draftAllowed = getAllowedDraftTypesForLeagueType(leagueType, s.sport)
      const draftType = draftAllowed.includes(s.draftType) ? s.draftType : (draftAllowed[0] ?? 'snake')
      const resolvedVariant =
        resolveEffectiveLeagueVariant({
          sport: s.sport,
          leagueType,
          requestedVariant: s.leagueVariant ?? s.scoringPreset ?? null,
        }).variant ?? 'STANDARD'
      const nextTeam = clampTeamCountForSport(String(s.sport), s.teamCount, leagueType)
      const nextFormat =
        leagueType === 'survivor'
          ? {
              ...s.formatOptions,
              survivorTeamCount: nextTeam,
              survivorTribeCountOverride: s.formatOptions.survivorTribeCountOverride ?? 4,
            }
          : s.formatOptions
      return {
        ...s,
        leagueType,
        draftType,
        leagueVariant: resolvedVariant,
        scoringPreset: resolvedVariant,
        teamCount: nextTeam,
        formatOptions: nextFormat,
      }
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
      const next = clampTeamCountForSport(String(s.sport), n, s.leagueType)
      if (s.leagueType === 'survivor') {
        return { ...s, teamCount: next, formatOptions: { ...s.formatOptions, survivorTeamCount: next } }
      }
      return { ...s, teamCount: next }
    })
  }, [])
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

  const handleFormatOptionsChange = useCallback((patch: Partial<WizardFormatOptions>) => {
    setState((s) => ({ ...s, formatOptions: { ...s.formatOptions, ...patch } }))
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
      if (state.leagueType === 'guillotine' && !state.formatOptions.guillotineRulesAcknowledged) {
        setError('Confirm Guillotine elimination rules on the AI & privacy step.')
        setCreating(false)
        return
      }
      if (state.leagueType === 'tournament') {
        const feederCount = getFeederLeagueCountForPool(state.formatOptions.tournamentParticipantPoolSize)
        const customLines = state.formatOptions.tournamentCustomLeagueNamesLines
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        if (
          state.formatOptions.tournamentLeagueNamingMode === 'commissioner_custom' &&
          !state.formatOptions.tournamentCustomLeagueNamesLines.trim()
        ) {
          setError('Enter feeder league names (one per line) or choose app-generated names.')
          setCreating(false)
          return
        }
        if (state.formatOptions.tournamentLeagueNamingMode === 'commissioner_custom' && customLines.length < feederCount) {
          setError(`Enter ${feederCount} feeder league names (one per line) for this pool size.`)
          setCreating(false)
          return
        }
        const tournamentDraft = mapDraftTypeToTournamentDraft(state.draftType)
        const res = await fetch('/api/tournament/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: state.name.trim() || 'Tournament',
            sport: state.sport,
            settings: {
              participantPoolSize: state.formatOptions.tournamentParticipantPoolSize,
              initialLeagueSize: 12,
              leagueNamingMode: state.formatOptions.tournamentLeagueNamingMode,
              draftType: tournamentDraft,
            },
            ...(state.formatOptions.tournamentLeagueNamingMode === 'commissioner_custom' && customLines.length > 0
              ? { leagueNames: customLines }
              : {}),
          }),
          credentials: 'same-origin',
        })
        const { ok, data, errorMessage } = await readFetchJson<{ tournamentId?: string }>(res)
        if (!ok) {
          setError(errorMessage ?? 'Failed to create tournament')
          return
        }
        const tournamentId = data?.tournamentId
        if (tournamentId) {
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(WIZARD_STORAGE_KEY)
          }
          onSuccess?.(tournamentId)
          router.push(buildPostCreateLeagueHomeHref({ leagueType: 'tournament', tournamentId }))
        } else {
          setError('Tournament created but no ID returned')
        }
        return
      }

      const effectiveLeagueSize =
        state.leagueType === 'survivor'
          ? clampSurvivorTeamCount(String(state.sport), state.teamCount)
          : state.teamCount

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
      const storedPrivacy = mapWizardVisibilityToStoredPrivacy(state.privacySettings.visibility)
      const body = {
        name,
        platform: 'manual',
        sport: state.sport,
        isDynasty,
        leagueVariant,
        leagueSize: effectiveLeagueSize,
        scoring: leagueVariant ?? undefined,
        league_type: state.leagueType,
        draft_type: state.draftType,
        ...(introUrl
          ? { introVideo: { url: introUrl, kind: 'concept_welcome' as const } }
          : {}),
        settings: {
          ...(state.templateSettingsOverrides ?? {}),
          ...formatOptionsApplyToLeagueType(state.leagueType, state.formatOptions, String(state.sport)),
          platform_style_mirror: state.platformStyleMirror,
          league_size: effectiveLeagueSize,
          league_type: state.leagueType,
          draft_type: state.draftType,
          league_timezone: state.leagueTimezone,
          scoring_format: presetScoringTemplate?.formatType ?? undefined,
          scoring_template_id: presetScoringTemplate?.templateId ?? undefined,
          trade_review_mode: state.tradeReviewMode,
          devy_rounds: devyRounds,
          devy_college_sports: devyCollegeSports,
          c2c_college_rounds: c2cCollegeRounds,
          c2c_college_sports: c2cCollegeSports,
          c2c_startup_mode: state.draftSettings.c2cStartupMode ?? 'merged',
          c2c_standings_model: state.draftSettings.c2cStandingsModel ?? 'unified',
          ai_adp_enabled: state.aiSettings.aiAdpEnabled,
          orphan_team_ai_manager_enabled: state.aiSettings.orphanTeamAiManagerEnabled,
          draft_helper_enabled: state.aiSettings.draftHelperEnabled,
          creation_commissioner_preferences_requested: state.commissionerPreferences,
          creation_commissioner_preferences: commissionerPlanUnlocked
            ? state.commissionerPreferences
            : { ...DEFAULT_COMMISSIONER_PREFERENCES },
          creation_commissioner_preferences_locked: !commissionerPlanUnlocked,
          draft_notifications_enabled: state.automationSettings.draftNotificationsEnabled,
          autopick_from_queue_enabled: state.automationSettings.autopickFromQueueEnabled,
          slow_draft_reminders_enabled: state.automationSettings.slowDraftRemindersEnabled,
          league_privacy_visibility: storedPrivacy,
          league_allow_invite_link: state.privacySettings.allowInviteLink,
          visibility: state.privacySettings.visibility,
          allow_invite_link: state.privacySettings.allowInviteLink,
        },
      }
      const res = await fetch('/api/league/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      })
      emitLeagueCreationPerf('wizard_create_response', {
        ok: res.ok,
        status: res.status,
        durationMs: Number(
          ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - createRequestStart).toFixed(1)
        ),
      })
      const { ok, data, errorMessage } = await readFetchJson<{ league?: { id: string } }>(res)
      if (!ok) {
        const statusHint = typeof res.status === 'number' ? ` (HTTP ${res.status})` : ''
        const baseMessage = errorMessage ?? 'Failed to create league'
        if (state.leagueType === 'survivor') {
          setError(`Survivor league creation failed${statusHint}: ${baseMessage}`)
        } else {
          setError(`${baseMessage}${statusHint}`)
        }
        return
      }
      const leagueId = data?.league?.id
      if (leagueId) {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(WIZARD_STORAGE_KEY)
        }
        onSuccess?.(leagueId)
        router.push(
          buildPostCreateLeagueHomeHref({
            leagueId,
            leagueType: state.leagueType,
            allowInviteLink: state.privacySettings.allowInviteLink,
          }),
        )
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
  }, [state, onSuccess, creationPreset?.scoringTemplate, commissionerPlanUnlocked, router])

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
    setState((s) => ({
      ...s,
      teamCount: clampTeamCountForSport(String(s.sport), defaultTeamCount, s.leagueType),
      formatOptions:
        s.leagueType === 'survivor'
          ? {
              ...s.formatOptions,
              survivorTeamCount: clampTeamCountForSport(String(s.sport), defaultTeamCount, 'survivor'),
            }
          : s.formatOptions,
    }))
    lastTeamPresetKeyRef.current = key
  }, [creationPreset?.league?.default_team_count, state.sport, state.leagueVariant, state.scoringPreset, state.leagueType])

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
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <TeamCountSelector
                    sport={String(state.sport)}
                    leagueType={state.leagueType}
                    teamCount={state.teamCount}
                    onTeamCountChange={handleTeamCountChange}
                  />
                </div>
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
          {state.step === 'team_setup' && (
            <>
              <TeamSizeSelector
                sport={String(state.sport)}
                leagueType={state.leagueType}
                name={state.name}
                teamCount={state.teamCount}
                tradeReviewMode={state.tradeReviewMode}
                leagueTimezone={state.leagueTimezone}
                onNameChange={handleNameChange}
                onTeamCountChange={handleTeamCountChange}
                onTradeReviewModeChange={handleTradeReviewModeChange}
                onTimezoneChange={handleTimezoneChange}
                showTeamCount={false}
              />
              <LeagueFormatOptionsPanel
                sport={String(state.sport)}
                leagueType={state.leagueType}
                value={state.formatOptions}
                onChange={handleFormatOptionsChange}
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
                <p className="rounded-2xl border border-white/10 bg-[#030b1f]/70 px-3 py-2 text-xs text-white/60">
                  Waivers, playoffs, schedule, and draft timing use sport defaults and can be changed in{' '}
                  <strong className="text-white/80">League settings</strong> after you create.
                </p>
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
              <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">
                Draft timing, rounds, and auction budgets use platform defaults for your sport and format. Configure
                them in <strong className="text-white/80">League settings</strong> after creation.
              </p>
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
              <LeagueSummaryPanel state={state} creationPreset={creationPreset} onEditStep={handleEditStep} />
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
    </div>
  )
}

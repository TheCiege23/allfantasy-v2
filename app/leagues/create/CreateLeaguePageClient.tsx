'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getAllowedDraftTypesForFormat,
  getFormatIntroMetadata,
  resolveLeagueFormat,
  type LeagueFormatModifierId,
} from '@/lib/league/format-engine'
import { SportStep } from './steps/SportStep'
import { FormatStep } from './steps/FormatStep'
import { ModifiersStep } from './steps/ModifiersStep'
import { DraftStep } from './steps/DraftStep'
import { RosterStep } from './steps/RosterStep'
import { ScoringStep } from './steps/ScoringStep'
import { RulesStep } from './steps/RulesStep'
import { InviteStep } from './steps/InviteStep'
import type { LeagueCreateFormState, LeagueCreateStepId } from './types'
import { readFetchJson } from '@/lib/http/readFetchJson'
import { buildPostCreateLeagueHomeHref } from '@/lib/league/post-create-navigation'

const STEP_ORDER: LeagueCreateStepId[] = [
  'sport',
  'format',
  'modifiers',
  'draft',
  'roster',
  'scoring',
  'rules',
  'invite',
]

const STEP_LABELS: Record<LeagueCreateStepId, string> = {
  sport: 'Sport',
  format: 'Format',
  modifiers: 'Modifiers',
  draft: 'Draft',
  roster: 'Roster',
  scoring: 'Scoring',
  rules: 'Rules',
  invite: 'Invite',
}

function deriveVariant(state: LeagueCreateFormState): string | null {
  if (state.formatId === 'devy') return 'devy_dynasty'
  if (state.formatId === 'c2c') return 'merged_devy_c2c'
  if (state.formatId === 'guillotine') return 'guillotine'
  if (state.formatId === 'survivor') return 'survivor'
  if (state.formatId === 'zombie') return 'zombie'
  if (state.formatId === 'salary_cap') return 'salary_cap'
  if (state.modifiers.includes('idp')) {
    return state.formatId === 'dynasty' ? 'DYNASTY_IDP' : 'IDP'
  }
  if (state.modifiers.includes('superflex') && state.sport === 'NFL') return 'SUPERFLEX'
  return null
}

function buildInitialState(): LeagueCreateFormState {
  const resolution = resolveLeagueFormat({
    sport: 'NFL',
    leagueType: 'redraft',
    draftType: 'snake',
    requestedModifiers: [],
  })

  return {
    sport: 'NFL',
    formatId: 'redraft',
    modifiers: [],
    leagueName: '',
    teamCount: resolution.leagueDefaults.default_team_count,
    draftType: resolution.draftType,
    draftRounds: resolution.draftDefaults.rounds_default,
    timerSeconds: resolution.draftDefaults.timer_seconds_default ?? 0,
    auctionBudget: 200,
    rosterSize: resolution.roster.rosterSize,
    scoringMode: resolution.scoring.defaultMode,
    scoringFormat: resolution.scoring.scoringFormat,
    maxKeepers: resolution.keeperPolicy.maxKeepers === 999 ? 0 : resolution.keeperPolicy.maxKeepers,
    salaryCap: 250,
    playoffTeamCount: resolution.playoffDefaults.playoff_team_count,
    regularSeasonLength: resolution.scheduleDefaults.regular_season_length,
    tradeReviewMode: 'commissioner',
    constitutionNotes: '',
    visibility: 'private',
    allowInviteLink: true,
    inviteEmails: '',
    survivorTribeCount: 3,
    survivorSeasonTheme: '',
    survivorChallengesSystemRun: true,
    survivorPlayerCount: 20,
    survivorCommissionerPlays: false,
    survivorTribeFormation: 'random',
    survivorTribeNaming: 'auto',
    survivorMergeTrigger: 'week',
    survivorMergeWeek: 7,
    survivorMergeAtCount: 10,
    survivorJuryStart: 'first_post_merge_vote',
    survivorIdolsEnabled: true,
    survivorIdolsTradable: false,
    survivorIdolsExpireAtMerge: true,
    survivorIdolCount: 9,
    survivorExileEnabled: true,
    survivorTokenEnabled: true,
    survivorBossResetEnabled: true,
    survivorSelfVoteAllowed: false,
    survivorRocksEnabled: true,
    survivorTieRule: 'rocks',
    survivorRevealMode: 'dramatic',
    survivorChallengeMode: 'automatic',
    guillotineEliminationsPerPeriod: 1,
    guillotineProtectedWeek1: false,
    guillotineEndgame: 'last_team_standing',
    guillotineTiebreaker: 'lowest_bench_points',
    guillotineWaiverMode: 'faab',
    guillotineFaabBudget: 100,
    guillotineSamePeriodPickups: false,
    guillotineTradesEnabled: false,
    zombieWhispererSelection: 'random',
  }
}

function parseInviteEmails(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function CreateLeaguePageClient() {
  const router = useRouter()
  const [step, setStep] = useState<LeagueCreateStepId>('sport')
  const [state, setState] = useState<LeagueCreateFormState>(() => buildInitialState())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetWizardState = useCallback(() => {
    setStep('sport')
    setState(buildInitialState())
    setError(null)
  }, [])

  const resolution = useMemo(
    () =>
      resolveLeagueFormat({
        sport: state.sport,
        leagueType: state.formatId,
        draftType: state.draftType,
        requestedModifiers: state.modifiers,
        leagueVariant: deriveVariant(state),
      }),
    [state]
  )

  useEffect(() => {
    const allowedDraftTypes = getAllowedDraftTypesForFormat(state.sport, state.formatId)
    const filteredModifiers = state.modifiers.filter((modifier) =>
      resolution.format.supportedModifiers.includes(modifier as LeagueFormatModifierId) ||
      resolution.format.defaultModifiers.includes(modifier as LeagueFormatModifierId)
    )

    setState((current) => {
      const nextDraftType = allowedDraftTypes.includes(current.draftType)
        ? current.draftType
        : resolution.draftType
      const nextModifiers =
        filteredModifiers.length === current.modifiers.length &&
        filteredModifiers.every((modifier, index) => modifier === current.modifiers[index])
          ? current.modifiers
          : filteredModifiers

      if (nextDraftType === current.draftType && nextModifiers === current.modifiers) {
        return current
      }

      return {
        ...current,
        draftType: nextDraftType,
        modifiers: nextModifiers,
      }
    })
  }, [resolution, state.draftType, state.formatId, state.modifiers, state.sport])

  const currentStepIndex = STEP_ORDER.indexOf(step)
  const intro = getFormatIntroMetadata({
    sport: state.sport,
    leagueType: state.formatId,
    leagueVariant: deriveVariant(state),
    requestedModifiers: state.modifiers,
  })

  const stepContent = {
    sport: <SportStep state={state} setState={setState} />,
    format: <FormatStep state={state} setState={setState} />,
    modifiers: <ModifiersStep state={state} setState={setState} />,
    draft: <DraftStep state={state} setState={setState} />,
    roster: <RosterStep state={state} setState={setState} />,
    scoring: <ScoringStep state={state} setState={setState} />,
    rules: <RulesStep state={state} setState={setState} />,
    invite: <InviteStep state={state} setState={setState} />,
  }[step]

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    const payload = {
      name: state.leagueName || `${state.sport} ${resolution.format.label}`,
      platform: 'manual' as const,
      sport: state.sport,
      leagueType: state.formatId,
      draftType: state.draftType,
      leagueVariant: deriveVariant(state) ?? undefined,
      isDynasty: resolution.format.defaultRosterMode !== 'redraft',
      isSuperflex: state.modifiers.includes('superflex'),
      leagueSize: state.teamCount,
      rosterSize: state.rosterSize,
      scoring: state.scoringFormat,
      settings: {
        sport_type: state.sport,
        league_type: state.formatId,
        format_id: state.formatId,
        format_modifiers: state.modifiers,
        league_variant: deriveVariant(state),
        requested_draft_type: state.draftType,
        draft_type: state.draftType,
        draft_rounds: state.draftRounds,
        draft_timer_seconds: state.timerSeconds,
        auction_budget_per_team: state.auctionBudget,
        roster_mode: resolution.format.defaultRosterMode,
        roster_size: state.rosterSize,
        starter_slots: resolution.roster.starterSlots,
        bench_slots: resolution.roster.benchSlots,
        ir_slots: resolution.roster.irSlots,
        taxi_slots: resolution.roster.taxiSlots,
        devy_slots: resolution.roster.devySlots,
        flex_definitions: resolution.roster.flexDefinitions,
        superflex: state.modifiers.includes('superflex'),
        te_premium: state.modifiers.includes('te_premium'),
        best_ball: state.modifiers.includes('best_ball') || state.formatId === 'best_ball',
        scoring_mode: state.scoringMode,
        scoring_format: state.scoringFormat,
        scoring_template_id: resolution.scoring.scoringTemplateId,
        scoring_settings: Object.fromEntries(
          resolution.scoring.rules.map((rule) => [rule.statKey, rule.pointsValue])
        ),
        scoring_snapshot: {
          templateId: resolution.scoring.scoringTemplateId,
          scoringMode: state.scoringMode,
          scoringFormat: state.scoringFormat,
          modifiers: state.modifiers,
        },
        intro_video: intro,
        keeper_settings: {
          maxKeepers: state.maxKeepers,
          supported: resolution.keeperPolicy.carryoverSupported,
          roundCostMode: resolution.keeperPolicy.roundCostMode,
        },
        salary_cap_settings:
          state.formatId === 'salary_cap'
            ? {
                startupCap: state.salaryCap,
                startupDraftType: state.draftType,
                enabled: true,
              }
            : null,
        playoff_team_count: state.playoffTeamCount,
        regular_season_length: state.regularSeasonLength,
        trade_review_mode: state.tradeReviewMode,
        privacy: {
          visibility: state.visibility,
          allowInviteLink: state.allowInviteLink,
        },
        invite_emails: parseInviteEmails(state.inviteEmails),
        constitution_request: {
          notes: state.constitutionNotes,
          requestedAt: new Date().toISOString(),
        },
        ...(state.formatId === 'survivor' && {
          survivor_suggested_tribe_count: Math.min(4, Math.max(2, Math.round(state.survivorTribeCount))),
          survivor_season_theme_label: state.survivorSeasonTheme.trim() || undefined,
          survivor_challenges_system_run: state.survivorChallengesSystemRun,
          survivor_player_count: state.survivorPlayerCount,
          survivor_commissioner_plays: state.survivorCommissionerPlays,
          survivor_tribe_formation: state.survivorTribeFormation,
          survivor_tribe_naming: state.survivorTribeNaming,
          survivor_merge_trigger: state.survivorMergeTrigger,
          survivor_merge_week: state.survivorMergeWeek,
          survivor_merge_at_count: state.survivorMergeAtCount,
          survivor_jury_start: state.survivorJuryStart,
          survivor_idols_enabled: state.survivorIdolsEnabled,
          survivor_idols_tradable: state.survivorIdolsTradable,
          survivor_idols_expire_at_merge: state.survivorIdolsExpireAtMerge,
          survivor_idol_count: state.survivorIdolCount,
          survivor_exile_enabled: state.survivorExileEnabled,
          survivor_token_enabled: state.survivorTokenEnabled,
          survivor_boss_reset_enabled: state.survivorBossResetEnabled,
          survivor_self_vote_allowed: state.survivorSelfVoteAllowed,
          survivor_rocks_enabled: state.survivorRocksEnabled,
          survivor_tie_rule: state.survivorTieRule,
          survivor_reveal_mode: state.survivorRevealMode,
          survivor_challenge_mode: state.survivorChallengeMode,
        }),
        ...(state.formatId === 'zombie' && {
          zombie_whisperer_selection: state.zombieWhispererSelection,
        }),
        ...(state.formatId === 'guillotine' && {
          guillotine_eliminations_per_period: state.guillotineEliminationsPerPeriod,
          guillotine_protected_week_1: state.guillotineProtectedWeek1,
          guillotine_endgame: state.guillotineEndgame,
          guillotine_tiebreaker: state.guillotineTiebreaker,
          guillotine_waiver_mode: state.guillotineWaiverMode,
          guillotine_faab_budget: state.guillotineFaabBudget,
          guillotine_same_period_pickups: state.guillotineSamePeriodPickups,
          guillotine_trades_enabled: state.guillotineTradesEnabled,
        }),
      },
    }

    try {
      const response = await fetch('/api/league/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      })

      const { ok, data, errorMessage } = await readFetchJson<{ league?: { id: string } }>(response)
      if (!ok) {
        throw new Error(errorMessage || 'Failed to create league')
      }
      if (!data?.league?.id) {
        throw new Error('League created but no ID returned')
      }

      router.push(
        buildPostCreateLeagueHomeHref({
          leagueId: data.league.id,
          leagueType: state.formatId,
          allowInviteLink: state.allowInviteLink,
        }),
      )
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create league')
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    if (currentStepIndex > 0) {
      setStep(STEP_ORDER[Math.max(0, currentStepIndex - 1)]!)
      return
    }
    resetWizardState()
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#040915] px-4 py-8 text-white">
      <div className="mx-auto mb-4 flex w-full max-w-6xl items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/import?returnTo=%2Fleagues%2Fcreate')}
          className="border-cyan-300/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
        >
          Import
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetWizardState()
            router.push('/dashboard')
          }}
        >
          Home
        </Button>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-[#081124]">
          <CardHeader>
            <CardTitle className="text-white">Create League</CardTitle>
            <CardDescription className="text-white/60">
              Build a format-aware league flow for every supported sport.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {STEP_ORDER.map((stepId, index) => (
                <button
                  key={stepId}
                  type="button"
                  onClick={() => setStep(stepId)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    stepId === step
                      ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
                      : index < currentStepIndex
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                        : 'border-white/10 bg-white/[0.03] text-white/60'
                  }`}
                >
                  {STEP_LABELS[stepId]}
                </button>
              ))}
            </div>

            {stepContent}

            {error ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handleBack}
              >
                Back
              </Button>
              {currentStepIndex === STEP_ORDER.length - 1 ? (
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create League'}
                </Button>
              ) : (
                <Button onClick={() => setStep(STEP_ORDER[Math.min(STEP_ORDER.length - 1, currentStepIndex + 1)]!)}>
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#081124]">
          <CardHeader>
            <CardTitle className="text-white">Format Preview</CardTitle>
            <CardDescription className="text-white/60">
              Deterministic defaults, AI policy, and intro media for the league you are building.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/75">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-lg font-semibold text-white">
                {state.leagueName || `${state.sport} ${resolution.format.label}`}
              </div>
              <div className="mt-1 text-white/60">{resolution.format.description}</div>
              {state.formatId === 'survivor' && (
                <div className="mt-3 space-y-1 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs text-amber-100/90">
                  <div>
                    Tribes: {Math.min(4, Math.max(2, state.survivorTribeCount))} · Theme:{' '}
                    {state.survivorSeasonTheme.trim() || '(set in Rules)'}
                  </div>
                  <div>Challenges: {state.survivorChallengesSystemRun ? 'System-run' : 'Manual'}</div>
                  <div className="text-white/55">Exile island linked at creation; FAQ posts when league chat is linked.</div>
                </div>
              )}
              {state.formatId === 'zombie' && (
                <div className="mt-3 space-y-1 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-100/90">
                  <div>Whisperer selection: {state.zombieWhispererSelection.replace(/_/g, ' ')}</div>
                  <div className="text-white/55">Zombie config is initialized; tune advanced rules in league settings after create.</div>
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">Draft</div>
                <div className="mt-2 text-white">{state.draftType.replace(/_/g, ' ')}</div>
                <div className="mt-1 text-xs text-white/55">
                  {state.draftRounds} rounds, {state.timerSeconds}s timer
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">Roster</div>
                <div className="mt-2 text-white">{state.rosterSize} total slots</div>
                <div className="mt-1 text-xs text-white/55">
                  {state.teamCount} teams, {resolution.format.defaultRosterMode} mode
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">Scoring</div>
                <div className="mt-2 text-white">{state.scoringFormat}</div>
                <div className="mt-1 text-xs text-white/55">{resolution.scoring.scoringTemplateId}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-wide text-white/45">Automation vs AI</div>
                <div className="mt-2 text-white">
                  {resolution.format.capabilities.weeklyAutomation ? 'Automated weekly engine' : 'Manual flow'}
                </div>
                <div className="mt-1 text-xs text-white/55">
                  {resolution.format.capabilities.aiOptionalFeatures.join(', ')}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-wide text-white/45">Intro Video</div>
              <div className="mt-2 text-white">{intro.title}</div>
              <div className="mt-1 text-xs text-white/55">{intro.introVideo}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

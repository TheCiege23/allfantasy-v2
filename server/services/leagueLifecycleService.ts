/**
 * League lifecycle state machine: validates actions and safe transitions for canonical leagues.
 * Integrates with settings snapshots, engines, and commissioner overrides (see `commissionerService.ts`).
 */

import type { League, LeagueLifecycleState } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/server/services/auditService'

export type LeagueLifecycleAction =
  | 'draft_pick'
  | 'draft_commissioner_control'
  | 'draft_start'
  | 'waiver_claim_submit'
  | 'waiver_process_run'
  | 'scoring_process_week'
  | 'scoring_correction'
  | 'standings_view'
  | 'standings_manual_edit'
  | 'settings_edit_general'
  | 'settings_edit_scoring'
  | 'settings_edit_roster'
  | 'settings_edit_draft'
  | 'settings_edit_waivers'
  | 'settings_edit_trades'
  | 'settings_edit_playoffs'
  | 'settings_edit_commissioner'
  | 'settings_edit_concept_rules'
  | 'settings_edit_ai'
  | 'automation_run'
  | 'roster_edit'
  | 'trade_act'
  | 'import_sync'
  | 'league_archive'
  | 'league_lock_toggle'

const TRANSITIONS: Record<LeagueLifecycleState, LeagueLifecycleState[]> = {
  setup: ['pre_draft', 'archived'],
  pre_draft: ['drafting', 'setup', 'archived'],
  drafting: ['post_draft', 'pre_draft', 'archived'],
  post_draft: ['in_season', 'drafting', 'archived'],
  in_season: ['playoffs', 'completed', 'drafting', 'archived'],
  playoffs: ['completed', 'in_season', 'archived'],
  completed: ['archived', 'in_season'],
  archived: [],
}

/** Actions allowed without commissioner override for each lifecycle phase. */
const ACTIONS: Record<LeagueLifecycleState, Set<LeagueLifecycleAction>> = {
  setup: new Set([
    'settings_edit_general',
    'settings_edit_scoring',
    'settings_edit_roster',
    'settings_edit_draft',
    'settings_edit_waivers',
    'settings_edit_trades',
    'settings_edit_playoffs',
    'settings_edit_commissioner',
    'settings_edit_concept_rules',
    'settings_edit_ai',
    'import_sync',
    'draft_commissioner_control',
    'league_archive',
    'league_lock_toggle',
  ]),
  pre_draft: new Set([
    'settings_edit_general',
    'settings_edit_scoring',
    'settings_edit_roster',
    'settings_edit_draft',
    'settings_edit_waivers',
    'settings_edit_trades',
    'settings_edit_playoffs',
    'settings_edit_commissioner',
    'settings_edit_concept_rules',
    'settings_edit_ai',
    'draft_start',
    'draft_commissioner_control',
    'import_sync',
    'league_archive',
    'league_lock_toggle',
  ]),
  drafting: new Set([
    'draft_pick',
    'draft_commissioner_control',
    'settings_edit_draft',
    'settings_edit_commissioner',
    'league_lock_toggle',
  ]),
  post_draft: new Set([
    'settings_edit_general',
    'settings_edit_draft',
    'settings_edit_commissioner',
    'settings_edit_waivers',
    'import_sync',
    'automation_run',
    'league_archive',
    'league_lock_toggle',
  ]),
  in_season: new Set([
    'waiver_claim_submit',
    'waiver_process_run',
    'scoring_process_week',
    'standings_view',
    'roster_edit',
    'trade_act',
    'settings_edit_general',
    'settings_edit_roster',
    'settings_edit_waivers',
    'settings_edit_trades',
    'settings_edit_playoffs',
    'settings_edit_commissioner',
    'settings_edit_ai',
    'automation_run',
    'import_sync',
    'scoring_correction',
    'standings_manual_edit',
    'league_lock_toggle',
    'league_archive',
  ]),
  playoffs: new Set([
    'waiver_claim_submit',
    'waiver_process_run',
    'scoring_process_week',
    'standings_view',
    'roster_edit',
    'trade_act',
    'settings_edit_general',
    'settings_edit_roster',
    'settings_edit_waivers',
    'settings_edit_trades',
    'settings_edit_playoffs',
    'settings_edit_commissioner',
    'settings_edit_ai',
    'automation_run',
    'scoring_correction',
    'standings_manual_edit',
    'league_lock_toggle',
    'league_archive',
  ]),
  completed: new Set([
    'standings_view',
    'settings_edit_commissioner',
    'league_archive',
    'league_lock_toggle',
  ]),
  archived: new Set(['standings_view']),
}

export function normalizeLifecycleState(raw: string | null | undefined): LeagueLifecycleState {
  const s = String(raw || 'in_season') as LeagueLifecycleState
  if (s in TRANSITIONS) return s
  return 'in_season'
}

export function getLeagueLifecycleState(league: Pick<League, 'lifecycleState'>): LeagueLifecycleState {
  return league.lifecycleState ?? 'in_season'
}

export function validateTransition(
  current: LeagueLifecycleState,
  next: LeagueLifecycleState,
): { ok: true } | { ok: false; reason: string } {
  if (current === next) {
    return { ok: false, reason: 'Already in requested state' }
  }
  const allowed = TRANSITIONS[current] ?? []
  if (!allowed.includes(next)) {
    return {
      ok: false,
      reason: `Cannot transition from ${current} to ${next}`,
    }
  }
  return { ok: true }
}

export function isActionAllowed(
  action: LeagueLifecycleAction,
  state: LeagueLifecycleState,
  opts?: { commissionerOverride?: boolean; roleIsElevated?: boolean },
): boolean {
  if (opts?.commissionerOverride && opts?.roleIsElevated) {
    return true
  }
  const set = ACTIONS[state]
  return Boolean(set?.has(action))
}

export function getAllowedActions(league: Pick<League, 'lifecycleState' | 'locked' | 'emergencyPaused'>): {
  state: LeagueLifecycleState
  actions: LeagueLifecycleAction[]
  locked: boolean
  emergencyPaused: boolean
} {
  const state = getLeagueLifecycleState(league)
  const list = [...(ACTIONS[state] ?? new Set())]
  return {
    state,
    actions: list,
    locked: league.locked ?? false,
    emergencyPaused: league.emergencyPaused ?? false,
  }
}

export type TransitionResult =
  | { ok: true; league: League }
  | { ok: false; error: string; code: 'INVALID' | 'FORBIDDEN' }

export async function transitionLeagueState(
  leagueId: string,
  nextState: LeagueLifecycleState,
  actorUserId: string,
  opts?: { force?: boolean; metadata?: Record<string, unknown> },
): Promise<TransitionResult> {
  const league = await prisma.league.findUnique({ where: { id: leagueId } })
  if (!league) return { ok: false, error: 'League not found', code: 'FORBIDDEN' }

  const current = getLeagueLifecycleState(league)
  const check = opts?.force ? { ok: true as const } : validateTransition(current, nextState)
  if (!check.ok) {
    return { ok: false, error: check.reason, code: 'INVALID' }
  }

  const before = { lifecycleState: current }
  const updated = await prisma.league.update({
    where: { id: leagueId },
    data: {
      lifecycleState: nextState,
      lifecycleMetadata: {
        ...(typeof league.lifecycleMetadata === 'object' && league.lifecycleMetadata !== null
          ? (league.lifecycleMetadata as Record<string, unknown>)
          : {}),
        lastTransitionAt: new Date().toISOString(),
        lastTransitionFrom: current,
        ...(opts?.metadata ?? {}),
      } as import('@prisma/client').Prisma.InputJsonValue,
    },
  })

  await logAction({
    leagueId,
    userId: actorUserId,
    actionType: 'lifecycle_transition',
    entityType: 'league',
    entityId: leagueId,
    beforeState: before,
    afterState: { lifecycleState: nextState },
    metadata: { force: Boolean(opts?.force) },
  })

  void import('@/lib/league-events/publisher')
    .then(({ publishLeagueFanoutEvent }) =>
      publishLeagueFanoutEvent({
        leagueId,
        eventType: 'lifecycle_transition',
        title: 'League phase updated',
        message: `Your league is now in ${String(nextState).replace(/_/g, ' ')}.`,
        category: 'league_announcements',
        visibility: 'all_members',
        actorUserId,
        meta: { from: current, to: nextState, force: Boolean(opts?.force) },
        dedupeKey: `lifecycle:${leagueId}:${current}->${nextState}`,
      }),
    )
    .catch(() => {})

  return { ok: true, league: updated }
}

export async function loadLeagueForLifecycle(leagueId: string) {
  return prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      userId: true,
      lifecycleState: true,
      locked: true,
      emergencyPaused: true,
      lifecycleMetadata: true,
      status: true,
    },
  })
}

export type LifecycleGateError = { status: number; error: string; code: string }

export async function assertLifecycleActionAllowed(
  leagueId: string,
  action: LeagueLifecycleAction,
  userId: string,
  opts?: { commissionerOverride?: boolean; isElevatedCommissioner?: boolean },
): Promise<{ ok: true } | { ok: false; err: LifecycleGateError }> {
  const row = await loadLeagueForLifecycle(leagueId)
  if (!row) {
    return { ok: false, err: { status: 404, error: 'League not found', code: 'NOT_FOUND' } }
  }

  const state = getLeagueLifecycleState(row as Pick<League, 'lifecycleState'>)
  const elevated = Boolean(opts?.isElevatedCommissioner)

  if (row.emergencyPaused && !elevated && action !== 'standings_view') {
    return {
      ok: false,
      err: {
        status: 423,
        error: 'League is emergency-paused. Only commissioners can act.',
        code: 'EMERGENCY_PAUSE',
      },
    }
  }

  if (
    row.locked &&
    !elevated &&
    action !== 'standings_view' &&
    action !== 'settings_edit_commissioner'
  ) {
    return {
      ok: false,
      err: {
        status: 423,
        error: 'League is locked. Use commissioner tools or override.',
        code: 'LEAGUE_LOCKED',
      },
    }
  }

  const allowed = isActionAllowed(action, state, {
    commissionerOverride: opts?.commissionerOverride,
    roleIsElevated: elevated,
  })

  if (!allowed) {
    return {
      ok: false,
      err: {
        status: 400,
        error: `Action "${action}" is not allowed in lifecycle state "${state}"`,
        code: 'LIFECYCLE_BLOCKED',
      },
    }
  }

  return { ok: true }
}

/**
 * Structured commissioner overrides: all paths require elevated permission + audit logging.
 */

import { prisma } from '@/lib/prisma'
import { undoLastPick } from '@/lib/live-draft-engine/DraftSessionService'
import { processWaiverClaimsForLeague } from '@/lib/waiver-wire/process-engine'
import { recomputeStandingsForSeason } from '@/server/services/standingsEngine'
import { runSpecialtyAutomationOrchestrator } from '@/lib/specialty-automation/orchestrator'
import type { AutomationTrigger } from '@/lib/specialty-automation/types'
import { logAction } from '@/server/services/auditService'
import {
  transitionLeagueState,
  type LeagueLifecycleAction,
  getLeagueLifecycleState,
} from '@/server/services/leagueLifecycleService'
import { assertLeagueActionGate } from '@/server/services/leagueActionGate'
import {
  canDestructiveCommissionerAction,
  isElevatedCommissioner,
  isHeadCommissioner,
} from '@/server/services/permissionService'
import type { LeagueLifecycleState } from '@prisma/client'

export type CommissionerConfirmation = {
  confirmed?: boolean
  reason?: string
}

async function requireElevated(leagueId: string, userId: string) {
  const ok = await isElevatedCommissioner(leagueId, userId)
  if (!ok) {
    const err = new Error('Forbidden') as Error & { status?: number }
    err.status = 403
    throw err
  }
}

async function requireHead(leagueId: string, userId: string) {
  const ok = await isHeadCommissioner(leagueId, userId)
  if (!ok) {
    const err = new Error('Forbidden') as Error & { status?: number }
    err.status = 403
    throw err
  }
}

export async function forceStateTransition(
  leagueId: string,
  userId: string,
  next: LeagueLifecycleState,
  opts?: { confirmation?: CommissionerConfirmation; metadata?: Record<string, unknown> },
) {
  await requireElevated(leagueId, userId)
  const res = await transitionLeagueState(leagueId, next, userId, {
    force: true,
    metadata: { ...opts?.metadata, confirmation: opts?.confirmation },
  })
  if (!res.ok) {
    const err = new Error(res.error) as Error & { status?: number; code?: string }
    err.status = res.code === 'FORBIDDEN' ? 403 : 400
    err.code = res.code
    throw err
  }
  return res.league
}

export async function reverseLastDraftPick(leagueId: string, userId: string) {
  await requireElevated(leagueId, userId)
  const gate = await assertLeagueActionGate(leagueId, userId, 'draft_commissioner_control')
  if (!gate.ok) {
    const err = new Error(gate.err.error) as Error & { status?: number }
    err.status = gate.err.status
    throw err
  }

  const before = await prisma.draftSession.findFirst({
    where: { leagueId },
    select: { id: true, status: true, nextOverallPick: true, currentRoundNum: true },
  })

  const ok = await undoLastPick(leagueId)
  await logAction({
    leagueId,
    userId,
    actionType: 'commissioner_undo_draft_pick',
    entityType: 'draft',
    entityId: before?.id ?? leagueId,
    beforeState: before ?? null,
    afterState: { undone: ok },
    metadata: { source: 'commissionerService.reverseLastDraftPick' },
  })
  return { ok }
}

export async function runWaiversNow(leagueId: string, userId: string) {
  await requireElevated(leagueId, userId)
  const gate = await assertLeagueActionGate(leagueId, userId, 'waiver_process_run')
  if (!gate.ok) {
    const err = new Error(gate.err.error) as Error & { status?: number }
    err.status = gate.err.status
    throw err
  }

  const results = await processWaiverClaimsForLeague(leagueId, {
    runType: 'manual',
    processedByUserId: userId,
  })
  await logAction({
    leagueId,
    userId,
    actionType: 'commissioner_run_waivers',
    entityType: 'waiver',
    entityId: leagueId,
    afterState: { processed: results.length },
    metadata: { source: 'commissionerService.runWaiversNow' },
  })
  return results
}

export async function manualRunAutomation(
  leagueId: string,
  userId: string,
  body: { season?: number; week?: number | null; trigger?: AutomationTrigger; force?: boolean },
) {
  await requireElevated(leagueId, userId)
  const gate = await assertLeagueActionGate(leagueId, userId, 'automation_run')
  if (!gate.ok) {
    const err = new Error(gate.err.error) as Error & { status?: number }
    err.status = gate.err.status
    throw err
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { season: true },
  })
  if (!league) {
    const err = new Error('League not found') as Error & { status?: number }
    err.status = 404
    throw err
  }

  const season = Math.max(2000, Math.min(2100, Number(body.season) || league.season))
  const weekRaw = body.week
  const week =
    weekRaw === null || weekRaw === undefined
      ? null
      : Math.max(0, Math.min(53, Number(weekRaw))) || null

  const out = await runSpecialtyAutomationOrchestrator({
    leagueId,
    season,
    week,
    trigger: body.trigger ?? 'onManualRun',
    force: Boolean(body.force),
    source: 'commissioner_service',
  })

  await logAction({
    leagueId,
    userId,
    actionType: 'commissioner_automation_run',
    entityType: 'automation',
    entityId: out.runId,
    afterState: { concept: out.concept, duplicate: out.duplicate },
    metadata: { trigger: body.trigger ?? 'onManualRun' },
  })

  return out
}

export async function editStandingsOverride(
  leagueId: string,
  userId: string,
  input: { season: number; rosterId: string; wins?: number; losses?: number; ties?: number; pointsFor?: number; pointsAgainst?: number },
) {
  await requireElevated(leagueId, userId)
  const gate = await assertLeagueActionGate(leagueId, userId, 'standings_manual_edit', {
    lifecycle: { commissionerOverride: true },
  })
  if (!gate.ok) {
    const err = new Error(gate.err.error) as Error & { status?: number }
    err.status = gate.err.status
    throw err
  }

  const before = await prisma.fantasyStanding.findUnique({
    where: {
      leagueId_season_rosterId: {
        leagueId,
        season: input.season,
        rosterId: input.rosterId,
      },
    },
  })

  const updated = await prisma.fantasyStanding.upsert({
    where: {
      leagueId_season_rosterId: {
        leagueId,
        season: input.season,
        rosterId: input.rosterId,
      },
    },
    create: {
      leagueId,
      season: input.season,
      rosterId: input.rosterId,
      wins: input.wins ?? 0,
      losses: input.losses ?? 0,
      ties: input.ties ?? 0,
      pointsFor: input.pointsFor ?? 0,
      pointsAgainst: input.pointsAgainst ?? 0,
      rank: 0,
    },
    update: {
      ...(input.wins !== undefined ? { wins: input.wins } : {}),
      ...(input.losses !== undefined ? { losses: input.losses } : {}),
      ...(input.ties !== undefined ? { ties: input.ties } : {}),
      ...(input.pointsFor !== undefined ? { pointsFor: input.pointsFor } : {}),
      ...(input.pointsAgainst !== undefined ? { pointsAgainst: input.pointsAgainst } : {}),
    },
  })

  await logAction({
    leagueId,
    userId,
    actionType: 'commissioner_edit_standings',
    entityType: 'standings',
    entityId: updated.id,
    beforeState: before ?? null,
    afterState: updated,
  })

  return updated
}

export async function editFaabOverride(leagueId: string, userId: string, rosterId: string, faab: number) {
  await requireElevated(leagueId, userId)
  const gate = await assertLeagueActionGate(leagueId, userId, 'waiver_claim_submit', {
    lifecycle: { commissionerOverride: true },
  })
  if (!gate.ok) {
    const err = new Error(gate.err.error) as Error & { status?: number }
    err.status = gate.err.status
    throw err
  }

  const before = await prisma.roster.findFirst({
    where: { id: rosterId, leagueId },
    select: { id: true, faabRemaining: true },
  })
  const updated = await prisma.roster.update({
    where: { id: rosterId },
    data: { faabRemaining: faab },
  })
  await logAction({
    leagueId,
    userId,
    actionType: 'commissioner_edit_faab',
    entityType: 'roster',
    entityId: rosterId,
    beforeState: before,
    afterState: { faabRemaining: updated.faabRemaining },
  })
  return updated
}

export async function editWaiverOrderOverride(leagueId: string, userId: string, rosterId: string, priority: number) {
  await requireElevated(leagueId, userId)
  const gate = await assertLeagueActionGate(leagueId, userId, 'waiver_claim_submit', {
    lifecycle: { commissionerOverride: true },
  })
  if (!gate.ok) {
    const err = new Error(gate.err.error) as Error & { status?: number }
    err.status = gate.err.status
    throw err
  }

  const before = await prisma.roster.findFirst({
    where: { id: rosterId, leagueId },
    select: { id: true, waiverPriority: true },
  })
  const updated = await prisma.roster.update({
    where: { id: rosterId },
    data: { waiverPriority: priority },
  })
  await logAction({
    leagueId,
    userId,
    actionType: 'commissioner_edit_waiver_priority',
    entityType: 'roster',
    entityId: rosterId,
    beforeState: before,
    afterState: { waiverPriority: updated.waiverPriority },
  })
  return updated
}

export async function setLeagueLocked(leagueId: string, userId: string, locked: boolean) {
  await requireElevated(leagueId, userId)
  const league = await prisma.league.findUnique({ where: { id: leagueId } })
  if (!league) {
    const err = new Error('League not found') as Error & { status?: number }
    err.status = 404
    throw err
  }

  const updated = await prisma.league.update({
    where: { id: leagueId },
    data: { locked },
  })
  await logAction({
    leagueId,
    userId,
    actionType: 'league_lock_toggle',
    entityType: 'league',
    entityId: leagueId,
    beforeState: { locked: league.locked },
    afterState: { locked: updated.locked },
  })
  return updated
}

export async function setEmergencyPause(leagueId: string, userId: string, paused: boolean) {
  await requireElevated(leagueId, userId)
  const league = await prisma.league.findUnique({ where: { id: leagueId } })
  if (!league) {
    const err = new Error('League not found') as Error & { status?: number }
    err.status = 404
    throw err
  }

  const updated = await prisma.league.update({
    where: { id: leagueId },
    data: { emergencyPaused: paused },
  })
  await logAction({
    leagueId,
    userId,
    actionType: 'emergency_pause_toggle',
    entityType: 'league',
    entityId: leagueId,
    beforeState: { emergencyPaused: league.emergencyPaused },
    afterState: { emergencyPaused: updated.emergencyPaused },
  })
  return updated
}

export async function archiveLeague(leagueId: string, userId: string) {
  await requireHead(leagueId, userId)
  return forceStateTransition(leagueId, userId, 'archived', {
    metadata: { source: 'commissionerService.archiveLeague' },
  })
}

export async function recomputeStandingsCommissioner(leagueId: string, userId: string, season: number) {
  await requireElevated(leagueId, userId)
  const gate = await assertLeagueActionGate(leagueId, userId, 'scoring_process_week')
  if (!gate.ok) {
    const err = new Error(gate.err.error) as Error & { status?: number }
    err.status = gate.err.status
    throw err
  }

  await recomputeStandingsForSeason(leagueId, season)
  await logAction({
    leagueId,
    userId,
    actionType: 'commissioner_recompute_standings',
    entityType: 'standings',
    entityId: String(season),
    metadata: { season },
  })
}

/** Map settings section to lifecycle action for guard checks. */
export function settingsSectionToLifecycleAction(section: string): LeagueLifecycleAction {
  switch (section) {
    case 'general':
      return 'settings_edit_general'
    case 'scoring':
      return 'settings_edit_scoring'
    case 'roster':
      return 'settings_edit_roster'
    case 'draft':
      return 'settings_edit_draft'
    case 'waivers':
      return 'settings_edit_waivers'
    case 'trades':
      return 'settings_edit_trades'
    case 'playoffs':
      return 'settings_edit_playoffs'
    case 'commissioner':
      return 'settings_edit_commissioner'
    case 'conceptRules':
      return 'settings_edit_concept_rules'
    case 'ai':
      return 'settings_edit_ai'
    default:
      return 'settings_edit_general'
  }
}

export async function assertSettingsEditAllowed(
  leagueId: string,
  userId: string,
  section: string,
  opts?: { scoringOverrideInPlayoffs?: boolean },
) {
  const elevated = await isElevatedCommissioner(leagueId, userId)
  if (!elevated) {
    const err = new Error('Forbidden') as Error & { status?: number }
    err.status = 403
    throw err
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { lifecycleState: true },
  })
  if (!league) {
    const err = new Error('League not found') as Error & { status?: number }
    err.status = 404
    throw err
  }

  const state = getLeagueLifecycleState(league)
  const action = settingsSectionToLifecycleAction(section)

  if (
    (state === 'playoffs' || state === 'completed') &&
    section === 'scoring' &&
    !opts?.scoringOverrideInPlayoffs
  ) {
    const err = new Error(
      'Scoring settings are frozen during playoffs/completed unless explicitly overridden.',
    ) as Error & { status?: number; code?: string }
    err.status = 400
    err.code = 'SCORING_LOCKED'
    throw err
  }

  const gate = await assertLeagueActionGate(leagueId, userId, action, {
    lifecycle: {
      commissionerOverride:
        (state === 'playoffs' || state === 'completed') &&
        section === 'scoring' &&
        Boolean(opts?.scoringOverrideInPlayoffs),
    },
  })
  if (!gate.ok) {
    const err = new Error(gate.err.error) as Error & { status?: number }
    err.status = gate.err.status
    throw err
  }
}

export { canDestructiveCommissionerAction }

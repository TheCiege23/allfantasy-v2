/**
 * Orphan / empty team automated drafter: CPU (rules-based) or AI (optional API, fallback to CPU).
 * Commissioner chooses mode; all actions logged and auditable.
 */

import { prisma } from '@/lib/prisma'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { getOrphanRosterIdsForLeague } from './orphanRosterResolver'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'
import { submitPick } from '@/lib/live-draft-engine/PickSubmissionService'
import { appendPickToRosterDraftSnapshot } from '@/lib/live-draft-engine/RosterAssignmentService'
import { getPlayerPoolForLeague } from '@/lib/sport-teams/SportPlayerPoolResolver'
import { computeCPUPick } from '@/lib/automated-drafter/CPUDrafterService'
import { computeAIDrafterPick } from '@/lib/automated-drafter/AIDrafterService'
import type { LeagueSport } from '@prisma/client'

export type AiManagerAuditAction = 'draft_pick' | 'trade_accept' | 'trade_reject' | 'trade_counter' | 'trade_send'

export interface LogActionInput {
  leagueId: string
  rosterId: string
  action: AiManagerAuditAction
  payload: Record<string, unknown>
  reason: string | null
  triggeredBy: string | null
}

export async function logAction(input: LogActionInput): Promise<void> {
  await (prisma as any).aiManagerAuditLog.create({
    data: {
      leagueId: input.leagueId,
      rosterId: input.rosterId,
      action: input.action,
      payload: input.payload as any,
      reason: input.reason,
      triggeredBy: input.triggeredBy,
    },
  })
}

export interface ExecuteDraftPickForOrphanInput {
  leagueId: string
  triggeredByUserId: string | null
}

export interface ExecuteDraftPickForOrphanResult {
  success: boolean
  error?: string
  pick?: { playerName: string; position: string; overall: number; round: number; slot: number }
  reason?: string
}

/**
 * If current on-the-clock roster is orphan and AI manager is enabled, compute recommendation and submit pick. Log action.
 */
export async function executeDraftPickForOrphan(
  input: ExecuteDraftPickForOrphanInput
): Promise<ExecuteDraftPickForOrphanResult> {
  const { leagueId, triggeredByUserId } = input
  const uiSettings = await getDraftUISettingsForLeague(leagueId)
  if (!uiSettings.orphanTeamAiManagerEnabled) {
    return { success: false, error: 'Orphan team AI manager is not enabled for this league.' }
  }

  const snapshot = await buildSessionSnapshot(leagueId)
  if (!snapshot || snapshot.status !== 'in_progress' || !snapshot.currentPick) {
    return { success: false, error: 'No draft in progress or no current pick.' }
  }

  const orphanRosterIds = await getOrphanRosterIdsForLeague(leagueId)
  const currentRosterId = snapshot.currentPick.rosterId
  if (!orphanRosterIds.includes(currentRosterId)) {
    return { success: false, error: 'Current pick is not an orphan roster. Only orphan rosters use the AI manager.' }
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, isDynasty: true },
  })
  if (!league) return { success: false, error: 'League not found.' }

  const draftedNames = new Set(snapshot.picks.map((p) => p.playerName))
  const sport = (league.sport as LeagueSport) ?? 'NFL'
  const pool = await getPlayerPoolForLeague(leagueId, sport, { limit: 500 })
  const available = pool
    .filter((p) => !draftedNames.has(p.full_name))
    .slice(0, 250)
    .map((p) => ({
      name: p.full_name,
      position: p.position ?? '',
      team: p.team_abbreviation ?? null,
      adp: null as number | null,
      byeWeek: null as number | null,
    }))

  if (available.length === 0) {
    return { success: false, error: 'No available players in pool for this pick.' }
  }

  const myPicks = snapshot.picks.filter((p) => p.rosterId === currentRosterId)
  const teamRoster = myPicks.map((p) => ({ position: p.position }))

  const drafterMode = uiSettings.orphanDrafterMode ?? 'cpu'
  const cpuInput = {
    available,
    teamRoster,
    rosterSlots: [] as string[],
    round: snapshot.currentPick.round,
    slot: snapshot.currentPick.slot,
    totalTeams: snapshot.teamCount,
    sport: String(sport),
    isDynasty: league.isDynasty ?? false,
    isSF: false,
    mode: 'needs' as const,
    queueFirst: [], // Orphan has no user queue; can be extended if roster-level queue exists
  }

  const pickResult =
    drafterMode === 'ai'
      ? await computeAIDrafterPick(cpuInput, { useAIProvider: true })
      : computeCPUPick(cpuInput)

  if (!pickResult) {
    return { success: false, error: 'Could not compute pick (no available players or recommendation).' }
  }

  const submitResult = await submitPick({
    leagueId,
    playerName: pickResult.player.name,
    position: pickResult.player.position,
    team: pickResult.player.team ?? null,
    rosterId: currentRosterId,
    source: 'auto',
  })

  if (!submitResult.success) {
    return { success: false, error: submitResult.error }
  }

  const reason = [pickResult.reason, pickResult.narrative].filter(Boolean).join(' ').trim() || pickResult.reason
  await logAction({
    leagueId,
    rosterId: currentRosterId,
    action: 'draft_pick',
    payload: {
      playerName: pickResult.player.name,
      position: pickResult.player.position,
      team: pickResult.player.team,
      round: snapshot.currentPick.round,
      slot: snapshot.currentPick.slot,
      overall: snapshot.currentPick.overall,
      confidence: pickResult.confidence,
      drafterMode: pickResult.drafterMode,
      narrative: pickResult.narrative ?? undefined,
    },
    reason,
    triggeredBy: triggeredByUserId,
  })

  try {
    await appendPickToRosterDraftSnapshot(leagueId, currentRosterId, {
      playerName: pickResult.player.name,
      position: pickResult.player.position,
      team: pickResult.player.team ?? null,
      playerId: null,
      byeWeek: null,
    }).catch(() => {})
  } catch (_) {}

  return {
    success: true,
    pick: {
      playerName: pickResult.player.name,
      position: pickResult.player.position,
      overall: snapshot.currentPick.overall,
      round: snapshot.currentPick.round,
      slot: snapshot.currentPick.slot,
    },
    reason,
  }
}

/**
 * Get recent AI manager audit entries for commissioner status.
 */
export async function getRecentAuditEntries(
  leagueId: string,
  options?: { limit?: number; rosterId?: string }
): Promise<Array<{ id: string; rosterId: string; action: string; payload: unknown; reason: string | null; triggeredBy: string | null; createdAt: Date }>> {
  const where: { leagueId: string; rosterId?: string } = { leagueId }
  if (options?.rosterId) where.rosterId = options.rosterId
  const rows = await (prisma as any).aiManagerAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 20,
    select: { id: true, rosterId: true, action: true, payload: true, reason: true, triggeredBy: true, createdAt: true },
  })
  return rows
}

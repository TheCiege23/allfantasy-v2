/**
 * Survivor Tribal Council: create council, close vote, eliminate, route to Exile (PROMPT 346). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { tallyVotes, getSeasonPointsFromRosterPerformance } from './SurvivorVoteEngine'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import { removeRosterFromTribeChat } from './SurvivorChatMembershipService'
import { enrollInExile } from './SurvivorExileEngine'
import { shouldJoinJury, enrollJuryMember } from './SurvivorJuryEngine'
import type { SurvivorCouncilResult } from './types'

/**
 * Create a Tribal Council for the week. Pre-merge: pass attendingTribeId. Merge: no tribe.
 */
export async function createCouncil(
  leagueId: string,
  week: number,
  phase: 'pre_merge' | 'merge',
  attendingTribeId: string | null,
  voteDeadlineAt: Date
): Promise<{ ok: boolean; councilId?: string; error?: string }> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const existing = await prisma.survivorTribalCouncil.findUnique({
    where: { configId_week: { configId: config.configId, week } },
  })
  if (existing) return { ok: false, error: 'Council already exists for this week' }

  const council = await prisma.survivorTribalCouncil.create({
    data: {
      leagueId,
      configId: config.configId,
      week,
      phase,
      attendingTribeId,
      voteDeadlineAt,
    },
  })
  return { ok: true, councilId: council.id }
}

/**
 * Close council: tally votes, apply tie-break, set eliminatedRosterId, close timestamp.
 * Returns result; caller should then call Exile enrollment and chat removal.
 */
export async function closeCouncil(
  councilId: string,
  seasonPointsSource?: { getSeasonPointsForRoster(leagueId: string, rosterId: string, throughWeek: number): Promise<number> }
): Promise<{ ok: boolean; result?: SurvivorCouncilResult; error?: string }> {
  const council = await prisma.survivorTribalCouncil.findUnique({
    where: { id: councilId },
  })
  if (!council) return { ok: false, error: 'Council not found' }
  if (council.closedAt) return { ok: false, error: 'Council already closed' }

  const source = seasonPointsSource ?? {
    getSeasonPointsForRoster: getSeasonPointsFromRosterPerformance,
  }
  const tally = await tallyVotes(councilId, source)
  const eliminatedRosterId = tally.eliminatedRosterId ?? Object.keys(tally.votesByTarget)[0] ?? null
  if (!eliminatedRosterId) {
    await prisma.survivorTribalCouncil.update({
      where: { id: councilId },
      data: { closedAt: new Date() },
    })
    return { ok: true, result: { councilId, week: council.week, phase: council.phase as 'pre_merge' | 'merge', eliminatedRosterId: '', voteCount: tally.votesByTarget, tieBreakUsed: tally.tied } }
  }

  await prisma.survivorTribalCouncil.update({
    where: { id: councilId },
    data: {
      closedAt: new Date(),
      eliminatedRosterId,
      tieBreakSeasonPoints: tally.tieBreakSeasonPoints != null ? (tally.tieBreakSeasonPoints as object) : Prisma.JsonNull,
    },
  })

  const config = await getSurvivorConfig(council.leagueId)
  if (config) {
    await appendSurvivorAudit(council.leagueId, config.configId, 'council_closed', {
      councilId,
      week: council.week,
      eliminatedRosterId,
      voteCount: tally.votesByTarget,
      tieBreak: tally.tied,
    })
    await appendSurvivorAudit(council.leagueId, config.configId, 'eliminated', {
      rosterId: eliminatedRosterId,
      week: council.week,
    })
  }

  await removeRosterFromTribeChat(council.leagueId, eliminatedRosterId)

  const eliminatedRoster = await prisma.roster.findUnique({
    where: { id: eliminatedRosterId, leagueId: council.leagueId },
    select: { platformUserId: true },
  })
  if (eliminatedRoster?.platformUserId) {
    await enrollInExile(council.leagueId, eliminatedRosterId, eliminatedRoster.platformUserId).catch((err) => {
      console.warn('[Survivor] Exile enrollment non-fatal:', err)
    })
  }

  const joinJury = await shouldJoinJury(council.leagueId, council.week)
  if (joinJury) {
    await enrollJuryMember(council.leagueId, eliminatedRosterId, council.week).catch((err) => {
      console.warn('[Survivor] Jury enrollment non-fatal:', err)
    })
  }

  return {
    ok: true,
    result: {
      councilId,
      week: council.week,
      phase: council.phase as 'pre_merge' | 'merge',
      eliminatedRosterId,
      voteCount: tally.votesByTarget,
      tieBreakUsed: tally.tied,
    },
  }
}

/**
 * Get council for a week.
 */
export async function getCouncil(leagueId: string, week: number) {
  const config = await getSurvivorConfig(leagueId)
  if (!config) return null
  return prisma.survivorTribalCouncil.findUnique({
    where: { configId_week: { configId: config.configId, week } },
    include: { votes: true },
  })
}

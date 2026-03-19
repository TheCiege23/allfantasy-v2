/**
 * Survivor return-to-island: check eligibility at N tokens (PROMPT 346). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { getTokenState } from './SurvivorTokenEngine'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import { isMergeTriggered } from './SurvivorMergeEngine'
import { isRosterCurrentlyEliminated } from './SurvivorRosterState'

/**
 * Check if roster in Exile is eligible to return (has enough tokens and merge has happened).
 */
export async function canReturnToIsland(
  mainLeagueId: string,
  exileLeagueId: string,
  exileRosterId: string,
  currentWeek: number
): Promise<{ eligible: boolean; reason?: string }> {
  const config = await getSurvivorConfig(mainLeagueId)
  if (!config) return { eligible: false, reason: 'Not a Survivor league' }
  if (!config.exileReturnEnabled) return { eligible: false, reason: 'Return not enabled' }

  const merged = await isMergeTriggered(mainLeagueId, currentWeek)
  if (!merged) return { eligible: false, reason: 'Merge has not happened yet' }

  const state = await getTokenState(exileLeagueId, exileRosterId)
  const tokens = state?.tokens ?? 0
  if (tokens < config.exileReturnTokens) return { eligible: false, reason: `Need ${config.exileReturnTokens} tokens; have ${tokens}` }

  const exileRoster = await prisma.roster.findFirst({
    where: { id: exileRosterId, leagueId: exileLeagueId },
    select: { platformUserId: true },
  })
  if (!exileRoster?.platformUserId) {
    return { eligible: false, reason: 'Exile roster is missing a linked manager' }
  }

  const mainRoster = await prisma.roster.findFirst({
    where: {
      leagueId: mainLeagueId,
      platformUserId: exileRoster.platformUserId,
    },
    select: { id: true },
  })
  if (!mainRoster) {
    return { eligible: false, reason: 'No matching main-league roster found' }
  }

  const stillEliminated = await isRosterCurrentlyEliminated(mainLeagueId, mainRoster.id)
  if (!stillEliminated) {
    return { eligible: false, reason: 'Manager is already active in the main Survivor league' }
  }

  return { eligible: true }
}

/**
 * Consume tokens and record return. Caller must add roster back to main league (product-specific).
 */
export async function executeReturn(
  mainLeagueId: string,
  exileLeagueId: string,
  exileRosterId: string,
  options?: { platformUserId?: string }
): Promise<{ ok: boolean; error?: string; mainRosterId?: string }> {
  const config = await getSurvivorConfig(mainLeagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const state = await getTokenState(exileLeagueId, exileRosterId)
  const tokens = state?.tokens ?? 0
  if (tokens < config.exileReturnTokens) return { ok: false, error: 'Insufficient tokens' }

  const exileRoster = await prisma.roster.findFirst({
    where: { id: exileRosterId, leagueId: exileLeagueId },
    select: { id: true, platformUserId: true },
  })
  if (!exileRoster) return { ok: false, error: 'Exile roster not found' }

  const platformUserId = options?.platformUserId ?? exileRoster.platformUserId ?? null
  if (!platformUserId) {
    return { ok: false, error: 'Unable to resolve the manager for this exile return' }
  }

  const mainRoster = await prisma.roster.findFirst({
    where: {
      leagueId: mainLeagueId,
      platformUserId,
    },
    select: { id: true },
  })
  if (!mainRoster) {
    return { ok: false, error: 'No matching main-league roster exists for this exile manager' }
  }

  const stillEliminated = await isRosterCurrentlyEliminated(mainLeagueId, mainRoster.id)
  if (!stillEliminated) {
    return { ok: false, error: 'This manager is already active in the main Survivor league', mainRosterId: mainRoster.id }
  }

  await prisma.survivorExileToken.updateMany({
    where: { exileLeagueId, rosterId: exileRosterId },
    data: { tokens: tokens - config.exileReturnTokens },
  })
  await prisma.survivorJuryMember.deleteMany({
    where: {
      leagueId: mainLeagueId,
      rosterId: mainRoster.id,
    },
  })
  await appendSurvivorAudit(mainLeagueId, config.configId, 'return_to_island', {
    exileRosterId,
    exileLeagueId,
    mainRosterId: mainRoster.id,
    platformUserId,
    tokensSpent: config.exileReturnTokens,
  })
  return { ok: true, mainRosterId: mainRoster.id }
}

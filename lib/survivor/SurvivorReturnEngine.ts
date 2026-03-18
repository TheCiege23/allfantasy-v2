/**
 * Survivor return-to-island: check eligibility at N tokens (PROMPT 346). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { getTokenState } from './SurvivorTokenEngine'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import { isMergeTriggered } from './SurvivorMergeEngine'

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
): Promise<{ ok: boolean; error?: string }> {
  const config = await getSurvivorConfig(mainLeagueId)
  if (!config) return { ok: false, error: 'Not a Survivor league' }

  const state = await getTokenState(exileLeagueId, exileRosterId)
  const tokens = state?.tokens ?? 0
  if (tokens < config.exileReturnTokens) return { ok: false, error: 'Insufficient tokens' }

  await prisma.survivorExileToken.updateMany({
    where: { exileLeagueId, rosterId: exileRosterId },
    data: { tokens: tokens - config.exileReturnTokens },
  })
  await appendSurvivorAudit(mainLeagueId, config.configId, 'return_to_island', {
    exileRosterId,
    exileLeagueId,
    tokensSpent: config.exileReturnTokens,
  })
  return { ok: true }
}

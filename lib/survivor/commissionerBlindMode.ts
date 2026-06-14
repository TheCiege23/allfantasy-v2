/**
 * Commissioner Blind Mode — when commissioner participates as a player,
 * they CANNOT access hidden information:
 * - Who has idols
 * - What idols are
 * - When idols are used (until public announcement)
 * - Vote counts before reveal
 * - Other players' powers or strategies
 *
 * The SYSTEM handles all vote counting, idol processing, and elimination
 * autonomously when the commissioner is a participant.
 */

import { prisma } from '@/lib/prisma'
import { resolveSurvivorAccessContext } from './survivorAccessControl'

/**
 * Check if the commissioner is participating as a player in this league.
 */
export async function isCommissionerParticipating(leagueId: string): Promise<boolean> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { userId: true },
  })
  if (!league) return false
  const access = await resolveSurvivorAccessContext(leagueId, league.userId)
  return Boolean(access?.isCommissionerParticipating)
}

/**
 * Check if a user is the commissioner AND in blind mode.
 * When true, the system must filter out hidden information from their view.
 */
export async function isUserInBlindMode(leagueId: string, userId: string): Promise<boolean> {
  const access = await resolveSurvivorAccessContext(leagueId, userId)
  return Boolean(access?.isParticipatingCommissioner)
}

/**
 * Filter API response data for a blind-mode commissioner.
 * Removes idol holder info, vote details, and hidden game state.
 */
export function filterForBlindMode(data: Record<string, unknown>): Record<string, unknown> {
  const filtered = { ...data }

  // Remove idol holder information
  if ('idols' in filtered && Array.isArray(filtered.idols)) {
    filtered.idols = filtered.idols.map((idol: unknown) => ({
      ...(idol as Record<string, unknown>),
      currentOwnerUserId: '[HIDDEN]',
      originalOwnerUserId: '[HIDDEN]',
      rosterId: '[HIDDEN]',
      playerId: '[HIDDEN]',
    }))
  }

  // Remove vote details before reveal
  if ('votes' in filtered && Array.isArray(filtered.votes)) {
    filtered.votes = filtered.votes.map((v: unknown) => ({
      ...(v as Record<string, unknown>),
      voterRosterId: '[HIDDEN]',
      voterUserId: '[HIDDEN]',
      voterName: '[HIDDEN]',
    }))
  }

  // Remove power assignments
  if ('powersByPlayer' in filtered) {
    filtered.powersByPlayer = {}
  }

  return filtered
}

/**
 * Check if commissioner can participate in an exile mini-game.
 * Only allowed if they were voted off the main island (not just observing).
 */
export async function canCommissionerPlayExileMiniGame(leagueId: string, userId: string): Promise<boolean> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { userId: true },
  })
  if (!league || league.userId !== userId) return true // Not commissioner, always can play

  const access = await resolveSurvivorAccessContext(leagueId, userId)
  return Boolean(access?.isUserExiled)
}

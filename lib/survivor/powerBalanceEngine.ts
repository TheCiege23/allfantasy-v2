/**
 * Power Balance Engine — enforces fair distribution and prevents power-stacking.
 *
 * Rules by league size:
 *   16 players: 8-10 total powers seeded, max 6 active at once
 *   18 players: 9-11 total powers seeded, max 7 active at once
 *   20 players: 10-14 total powers seeded, max 9 active at once
 *
 * Stacking limits:
 *   - Max 2 powers per player (any category)
 *   - Max 1 power per player per category
 *   - Tribe-wide powers are 2x rarer than personal powers
 *   - No more than 3 immunity-class powers active at once
 *   - No more than 2 vote-control powers active at once
 *   - Disadvantages don't count toward personal limits
 *
 * Density rules:
 *   - Pre-merge: 60% of total power pool seeded
 *   - Post-merge: 30% reserved for challenge/twist awards
 *   - Finale: 10% for endgame powers only
 *   - If > 50% of active players hold powers, slow new assignments
 */

import { prisma } from '@/lib/prisma'

export interface PowerBalanceLimits {
  totalPoolSize: number
  maxActiveCirculation: number
  maxPerPlayer: number
  maxPerPlayerPerCategory: number
  maxImmunityActive: number
  maxVoteControlActive: number
  maxScorePowersActive: number
  maxTribePowersActive: number
  preMergeSeedPercent: number
  postMergeReservePercent: number
  finaleReservePercent: number
}

export function getBalanceLimitsForLeagueSize(playerCount: number): PowerBalanceLimits {
  if (playerCount <= 16) {
    return {
      totalPoolSize: 9,
      maxActiveCirculation: 6,
      maxPerPlayer: 2,
      maxPerPlayerPerCategory: 1,
      maxImmunityActive: 2,
      maxVoteControlActive: 2,
      maxScorePowersActive: 2,
      maxTribePowersActive: 1,
      preMergeSeedPercent: 0.6,
      postMergeReservePercent: 0.3,
      finaleReservePercent: 0.1,
    }
  }
  if (playerCount <= 18) {
    return {
      totalPoolSize: 11,
      maxActiveCirculation: 7,
      maxPerPlayer: 2,
      maxPerPlayerPerCategory: 1,
      maxImmunityActive: 3,
      maxVoteControlActive: 2,
      maxScorePowersActive: 2,
      maxTribePowersActive: 1,
      preMergeSeedPercent: 0.6,
      postMergeReservePercent: 0.3,
      finaleReservePercent: 0.1,
    }
  }
  // 20 players
  return {
    totalPoolSize: 12,
    maxActiveCirculation: 9,
    maxPerPlayer: 2,
    maxPerPlayerPerCategory: 1,
    maxImmunityActive: 3,
    maxVoteControlActive: 2,
    maxScorePowersActive: 3,
    maxTribePowersActive: 2,
    preMergeSeedPercent: 0.6,
    postMergeReservePercent: 0.3,
    finaleReservePercent: 0.1,
  }
}

export interface BalanceCheck {
  allowed: boolean
  reason?: string
}

/**
 * Check if a new power can be assigned to a player.
 */
export async function canAssignPower(
  leagueId: string,
  targetUserId: string,
  powerCategory: string,
): Promise<BalanceCheck> {
  const limits = await getLeagueLimits(leagueId)

  // Check active circulation
  const activeCount = await (prisma as any).survivorIdol.count({
    where: { leagueId, status: 'hidden', isUsed: false },
  })
  if (activeCount >= limits.maxActiveCirculation) {
    return { allowed: false, reason: `Max active powers (${limits.maxActiveCirculation}) reached` }
  }

  // Check per-player limit
  const playerPowers = await (prisma as any).survivorIdol.count({
    where: { leagueId, currentOwnerUserId: targetUserId, status: 'hidden', isUsed: false },
  })
  if (playerPowers >= limits.maxPerPlayer) {
    return { allowed: false, reason: `Player already holds ${limits.maxPerPlayer} powers` }
  }

  // Check per-player per-category limit
  const categoryPowers = await (prisma as any).survivorIdol.count({
    where: { leagueId, currentOwnerUserId: targetUserId, powerCategory, status: 'hidden', isUsed: false },
  })
  if (categoryPowers >= limits.maxPerPlayerPerCategory) {
    return { allowed: false, reason: `Player already holds a ${powerCategory} power` }
  }

  // Check category-specific caps
  const categoryCaps: Record<string, number> = {
    immunity: limits.maxImmunityActive,
    vote_control: limits.maxVoteControlActive,
    score: limits.maxScorePowersActive,
    tribe_control: limits.maxTribePowersActive,
  }
  const cap = categoryCaps[powerCategory]
  if (cap != null) {
    const catActive = await (prisma as any).survivorIdol.count({
      where: { leagueId, powerCategory, status: 'hidden', isUsed: false },
    })
    if (catActive >= cap) {
      return { allowed: false, reason: `Max ${powerCategory} powers (${cap}) in circulation` }
    }
  }

  return { allowed: true }
}

/**
 * Check if the power density is too high (> 50% of active players hold powers).
 */
export async function isPowerDensityHigh(leagueId: string): Promise<boolean> {
  const gameState = await (prisma as any).survivorGameState.findUnique({
    where: { leagueId },
  })
  const activePlayers = gameState?.activePlayerCount ?? 0
  if (activePlayers === 0) return false

  const holdersCount = await (prisma as any).survivorIdol.groupBy({
    by: ['currentOwnerUserId'],
    where: { leagueId, status: 'hidden', isUsed: false, currentOwnerUserId: { not: null } },
  })

  return holdersCount.length / activePlayers > 0.5
}

/**
 * Update the SurvivorPowerBalance record for a league.
 */
export async function refreshPowerBalance(leagueId: string): Promise<void> {
  const powers = await (prisma as any).survivorIdol.findMany({
    where: { leagueId, status: 'hidden', isUsed: false },
    select: { powerCategory: true, currentOwnerUserId: true },
  })

  const counts = {
    activePowerCount: powers.length,
    immunityPowerCount: powers.filter((p: any) => p.powerCategory === 'immunity').length,
    voteControlCount: powers.filter((p: any) => p.powerCategory === 'vote_control').length,
    scorePowerCount: powers.filter((p: any) => p.powerCategory === 'score').length,
    tribeControlCount: powers.filter((p: any) => p.powerCategory === 'tribe_control').length,
    infoPowerCount: powers.filter((p: any) => p.powerCategory === 'information').length,
  }

  const powersByPlayer: Record<string, number> = {}
  for (const p of powers) {
    if (p.currentOwnerUserId) {
      powersByPlayer[p.currentOwnerUserId] = (powersByPlayer[p.currentOwnerUserId] ?? 0) + 1
    }
  }

  await (prisma as any).survivorPowerBalance.upsert({
    where: { leagueId },
    create: { leagueId, ...counts, powersByPlayer, lastUpdated: new Date() },
    update: { ...counts, powersByPlayer, lastUpdated: new Date() },
  })
}

async function getLeagueLimits(leagueId: string): Promise<PowerBalanceLimits> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { survivorPlayerCount: true },
  })
  return getBalanceLimitsForLeagueSize(league?.survivorPlayerCount ?? 20)
}

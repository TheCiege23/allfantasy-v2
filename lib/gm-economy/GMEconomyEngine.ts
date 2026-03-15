/**
 * GMEconomyEngine — orchestrates career aggregation, profile upsert, and progression events.
 */

import { prisma } from '@/lib/prisma'
import { aggregateCareerForManager } from './CareerProgressionAggregator'
import type { ManagerFranchiseProfileInput } from './types'

export interface GMEconomyRunResult {
  managerId: string
  profileId: string
  gmPrestigeScore: number
  franchiseValue: number
  created: boolean
}

/**
 * Run the GM economy for one manager: aggregate career, upsert profile.
 * Does not create GMProgressionEvent records in this pass (can be added for championship/playoff events).
 */
export async function runGMEconomyForManager(managerId: string): Promise<GMEconomyRunResult | null> {
  const input = await aggregateCareerForManager(managerId)

  const existing = await prisma.managerFranchiseProfile.findUnique({
    where: { managerId },
  })

  const data = {
    managerId: input.managerId,
    totalCareerSeasons: input.totalCareerSeasons,
    totalLeaguesPlayed: input.totalLeaguesPlayed,
    championshipCount: input.championshipCount,
    playoffAppearances: input.playoffAppearances,
    careerWinPercentage: input.careerWinPercentage,
    gmPrestigeScore: input.gmPrestigeScore,
    franchiseValue: input.franchiseValue,
  }

  if (existing) {
    await prisma.managerFranchiseProfile.update({
      where: { id: existing.id },
      data,
    })
    return {
      managerId,
      profileId: existing.id,
      gmPrestigeScore: input.gmPrestigeScore,
      franchiseValue: input.franchiseValue,
      created: false,
    }
  }

  const created = await prisma.managerFranchiseProfile.create({
    data,
  })
  return {
    managerId,
    profileId: created.id,
    gmPrestigeScore: input.gmPrestigeScore,
    franchiseValue: input.franchiseValue,
    created: true,
  }
}

/**
 * Run GM economy for all managers that have at least one Roster (platform users).
 */
export async function runGMEconomyForAll(options?: {
  limit?: number
}): Promise<{ processed: number; created: number; updated: number; results: GMEconomyRunResult[] }> {
  const limit = options?.limit ?? 500
  const rosters = await prisma.roster.findMany({
    select: { platformUserId: true },
    take: limit * 2,
  })
  const managerIds = Array.from(new Set(rosters.map((r) => r.platformUserId))).slice(0, limit)

  let created = 0
  let updated = 0
  const results: GMEconomyRunResult[] = []

  for (const managerId of managerIds) {
    const r = await runGMEconomyForManager(managerId)
    if (r) {
      results.push(r)
      if (r.created) created++
      else updated++
    }
  }

  return {
    processed: results.length,
    created,
    updated,
    results,
  }
}

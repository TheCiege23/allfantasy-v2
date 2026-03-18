/**
 * Zombie Universe config and CRUD (PROMPT 353).
 * Universe = group of leagues in levels (Gamma, Beta, Alpha).
 */

import { prisma } from '@/lib/prisma'
import type { ZombieUniverseLevelRow, ZombieUniverseLeagueRow } from './types'

export interface ZombieUniverseSettings {
  leagueCount?: number
  levelNames?: string[]
  teamsPerLeague?: number
  movementPromoteCount?: number
  movementRelegateCount?: number
  tieBreakers?: string[]
}

export async function getZombieUniverse(universeId: string) {
  return prisma.zombieUniverse.findUnique({
    where: { id: universeId },
    include: { levels: { orderBy: { rankOrder: 'asc' } }, leagues: { include: { level: true } } },
  })
}

export async function getUniverseLevels(universeId: string): Promise<ZombieUniverseLevelRow[]> {
  const rows = await prisma.zombieUniverseLevel.findMany({
    where: { universeId },
    orderBy: { rankOrder: 'asc' },
  })
  return rows.map((r) => ({
    id: r.id,
    universeId: r.universeId,
    name: r.name,
    rankOrder: r.rankOrder,
    leagueCount: r.leagueCount,
  }))
}

export async function getUniverseLeagues(universeId: string): Promise<ZombieUniverseLeagueRow[]> {
  const rows = await prisma.zombieLeague.findMany({
    where: { universeId },
    include: { level: true },
    orderBy: [{ level: { rankOrder: 'asc' } }, { orderInLevel: 'asc' }],
  })
  return rows.map((r) => ({
    id: r.id,
    universeId: r.universeId,
    levelId: r.levelId,
    leagueId: r.leagueId,
    name: r.name,
    orderInLevel: r.orderInLevel,
  }))
}

export async function createZombieUniverse(input: {
  name: string
  sport?: string
  settings?: ZombieUniverseSettings
}) {
  return prisma.zombieUniverse.create({
    data: {
      name: input.name,
      sport: input.sport ?? 'NFL',
      settings: (input.settings ?? {}) as object,
    },
  })
}

export async function addLevelToUniverse(universeId: string, name: string, rankOrder: number, leagueCount: number) {
  return prisma.zombieUniverseLevel.create({
    data: { universeId, name, rankOrder, leagueCount },
  })
}

export async function attachLeagueToUniverse(input: {
  universeId: string
  levelId: string
  leagueId: string
  name?: string
  orderInLevel?: number
}) {
  return prisma.zombieLeague.create({
    data: {
      universeId: input.universeId,
      levelId: input.levelId,
      leagueId: input.leagueId,
      name: input.name ?? null,
      orderInLevel: input.orderInLevel ?? 0,
    },
  })
}

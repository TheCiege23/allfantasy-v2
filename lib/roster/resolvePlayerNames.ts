import type { LeagueSport } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function fallbackPlayerLabel(playerId: string): string {
  return `Player ${playerId.slice(0, 8)}`
}

function setNameIfPresent(map: Map<string, string>, playerId: string | null | undefined, name: string | null | undefined): void {
  if (!playerId || !name || map.has(playerId)) return
  const trimmed = name.trim()
  if (!trimmed) return
  map.set(playerId, trimmed)
}

function normalizeSport(sport: LeagueSport | string | null | undefined): string {
  const raw = String(sport ?? 'NFL').trim().toUpperCase()
  return raw || 'NFL'
}

export function normalizePlayerLookupToken(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function resolvePlayerNamesForSport(
  playerIds: string[],
  sport: LeagueSport | string | null | undefined
): Promise<Map<string, string>> {
  const uniquePlayerIds = [...new Set(playerIds.map((id) => id?.trim()).filter((id): id is string => Boolean(id)))]
  const nameMap = new Map<string, string>()
  if (uniquePlayerIds.length === 0) return nameMap

  const normalizedSport = normalizeSport(sport)

  if (normalizedSport === 'NFL') {
    try {
      const { getAllPlayers } = await import('@/lib/sleeper-client')
      const allPlayers = await getAllPlayers()
      for (const playerId of uniquePlayerIds) {
        const player = allPlayers[playerId]
        const fullName =
          player?.full_name ??
          (player ? `${(player as { first_name?: string }).first_name ?? ''} ${(player as { last_name?: string }).last_name ?? ''}`.trim() : '')
        setNameIfPresent(nameMap, playerId, fullName)
      }
    } catch {
      // Fall through to local database lookups.
    }
  }

  try {
    const identityRows = await prisma.playerIdentityMap.findMany({
      where: {
        sport: normalizedSport,
        OR: [
          { sleeperId: { in: uniquePlayerIds } },
          { espnId: { in: uniquePlayerIds } },
          { mflId: { in: uniquePlayerIds } },
          { fleaflickerId: { in: uniquePlayerIds } },
          { apiSportsId: { in: uniquePlayerIds } },
          { clearSportsId: { in: uniquePlayerIds } },
          { fantasyCalcId: { in: uniquePlayerIds } },
          { rollingInsightsId: { in: uniquePlayerIds } },
        ],
      },
      select: {
        canonicalName: true,
        sleeperId: true,
        espnId: true,
        mflId: true,
        fleaflickerId: true,
        apiSportsId: true,
        clearSportsId: true,
        fantasyCalcId: true,
        rollingInsightsId: true,
      },
    })

    for (const row of identityRows) {
      setNameIfPresent(nameMap, row.sleeperId, row.canonicalName)
      setNameIfPresent(nameMap, row.espnId, row.canonicalName)
      setNameIfPresent(nameMap, row.mflId, row.canonicalName)
      setNameIfPresent(nameMap, row.fleaflickerId, row.canonicalName)
      setNameIfPresent(nameMap, row.apiSportsId, row.canonicalName)
      setNameIfPresent(nameMap, row.clearSportsId, row.canonicalName)
      setNameIfPresent(nameMap, row.fantasyCalcId, row.canonicalName)
      setNameIfPresent(nameMap, row.rollingInsightsId, row.canonicalName)
    }
  } catch {
    // Optional mapping layer; ignore lookup failures.
  }

  try {
    const sportsPlayers = await prisma.sportsPlayer.findMany({
      where: {
        sport: normalizedSport,
        OR: [
          { externalId: { in: uniquePlayerIds } },
          { sleeperId: { in: uniquePlayerIds } },
        ],
      },
      select: {
        externalId: true,
        sleeperId: true,
        name: true,
      },
    })

    for (const player of sportsPlayers) {
      setNameIfPresent(nameMap, player.externalId, player.name)
      setNameIfPresent(nameMap, player.sleeperId, player.name)
    }
  } catch {
    // Optional lookup; ignore failures.
  }

  for (const playerId of uniquePlayerIds) {
    if (!nameMap.has(playerId)) {
      nameMap.set(playerId, fallbackPlayerLabel(playerId))
    }
  }

  return nameMap
}

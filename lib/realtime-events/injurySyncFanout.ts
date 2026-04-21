/**
 * After external injury DB syncs, fan out `player_injury_update` only to leagues that roster
 * the player — bounded emits to avoid spam (Sleeper-like signal without notifying the world).
 */
import 'server-only'

import { prisma } from '@/lib/prisma'
import { emitPlayerInjuryOrNewsFanout } from '@/lib/realtime-events/realtimeEventService'
import {
  injuryFanoutSortPriority,
  shouldIncludeInjuryInFanoutBatch,
  type InjurySyncFanoutRow,
} from '@/lib/realtime-events/injuryFanoutPolicy'

export type { InjurySyncFanoutRow }
export { injuryFanoutSortPriority, shouldIncludeInjuryInFanoutBatch }

const DEFAULT_MAX_EMITS = 28
/** Max distinct players to resolve per sync (limits DB round-trips). */
const MAX_PLAYERS_PER_SYNC = 48

function hourBucket(): number {
  return Math.floor(Date.now() / (60 * 60 * 1000))
}

async function findLeagueIdsForRosteredPlayer(playerName: string, sport: string): Promise<string[]> {
  const name = playerName.trim()
  if (!name) return []
  const sportU = sport.toUpperCase()

  const exact = await prisma.redraftRosterPlayer.findMany({
    where: {
      droppedAt: null,
      sport: sportU,
      playerName: { equals: name, mode: 'insensitive' },
    },
    select: {
      roster: { select: { leagueId: true } },
    },
    take: 500,
  })

  const ids = new Set<string>()
  for (const row of exact) {
    const lid = row.roster?.leagueId
    if (lid) ids.add(lid)
  }

  if (ids.size === 0 && name.length >= 6) {
    const fuzzy = await prisma.redraftRosterPlayer.findMany({
      where: {
        droppedAt: null,
        sport: sportU,
        playerName: { contains: name, mode: 'insensitive' },
      },
      select: {
        roster: { select: { leagueId: true } },
      },
      take: 200,
    })
    for (const row of fuzzy) {
      const lid = row.roster?.leagueId
      if (lid) ids.add(lid)
    }
  }

  return [...ids]
}

/**
 * Emits league activity + SSE (skipNotifications) for roster-relevant injuries, capped per sync.
 */
export async function fanoutInjurySyncBatch(params: {
  sport: string
  injuries: InjurySyncFanoutRow[]
  maxEmits?: number
}): Promise<{ emitted: number; injuriesSkippedForCap: number }> {
  const maxEmits = params.maxEmits ?? DEFAULT_MAX_EMITS
  const byPlayer = new Map<string, InjurySyncFanoutRow>()
  for (const inj of params.injuries) {
    if (!shouldIncludeInjuryInFanoutBatch(inj.status)) continue
    const k = inj.playerName.trim().toLowerCase()
    if (!k) continue
    const prev = byPlayer.get(k)
    if (!prev || injuryFanoutSortPriority(inj.status) < injuryFanoutSortPriority(prev.status)) {
      byPlayer.set(k, inj)
    }
  }

  const list = [...byPlayer.values()]
    .sort((a, b) => injuryFanoutSortPriority(a.status) - injuryFanoutSortPriority(b.status))
    .slice(0, MAX_PLAYERS_PER_SYNC)

  let emitted = 0
  let injuriesSkippedForCap = 0
  const hb = hourBucket()
  const sport = params.sport.toUpperCase()

  outer: for (const inj of list) {
    if (emitted >= maxEmits) {
      injuriesSkippedForCap += 1
      continue
    }

    const leagueIds = await findLeagueIdsForRosteredPlayer(inj.playerName, sport)
    if (leagueIds.length === 0) continue

    const title = `Injury: ${inj.playerName} (${inj.status})`
    const msgParts = [inj.type, inj.description].filter(Boolean).join(' — ')
    const message =
      msgParts.length > 0
        ? msgParts.slice(0, 480)
        : `${inj.playerName} — ${inj.status}${inj.team ? ` (${inj.team})` : ''}`

    for (const leagueId of leagueIds) {
      if (emitted >= maxEmits) {
        break outer
      }
      try {
        await emitPlayerInjuryOrNewsFanout({
          leagueId,
          eventType: 'player_injury_update',
          title: title.slice(0, 256),
          message: message.slice(0, 500),
          category: 'injury_alerts',
          meta: {
            playerName: inj.playerName,
            team: inj.team,
            status: inj.status,
            type: inj.type ?? null,
            source: 'injury_sync',
          },
          dedupeKey: `inj-sync:${sport}:${leagueId}:${inj.playerName.toLowerCase()}:${hb}`,
          skipNotifications: true,
        })
        emitted += 1
      } catch {
        // non-fatal
      }
    }
  }

  return { emitted, injuriesSkippedForCap }
}

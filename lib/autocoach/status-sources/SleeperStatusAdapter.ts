import 'server-only'

import { prisma } from '@/lib/prisma'

type SleeperSport = 'nfl' | 'nba'

const cache = {
  nfl: null as { at: number; map: Map<string, string> } | null,
  nba: null as { at: number; map: Map<string, string> } | null,
}

async function isGameDayForSport(sport: string): Promise<boolean> {
  const sk = sport.toUpperCase()
  const today = new Date().toISOString().slice(0, 10)
  const d = new Date(`${today}T12:00:00.000Z`)
  const start = new Date(d)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  const n = await prisma.sportsGame.count({
    where: { sport: sk, startTime: { gte: start, lt: end } },
  })
  return n > 0
}

function ttlMs(isGameDay: boolean): number {
  return isGameDay ? 60_000 : 10 * 60_000
}

/**
 * Bulk Sleeper players JSON; returns map of sleeper player_id -> injury_status (non-null only).
 */
export async function fetchSleeperStatuses(sport: SleeperSport): Promise<Map<string, string>> {
  const key = sport.toLowerCase() as SleeperSport
  const gameDay = await isGameDayForSport(sport === 'nfl' ? 'NFL' : 'NBA')
  const ttl = ttlMs(gameDay)
  const slot = cache[key]
  if (slot && Date.now() - slot.at < ttl) {
    return slot.map
  }

  try {
    const res = await fetch(`https://api.sleeper.app/v1/players/${key}`, {
      cache: 'no-store',
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      console.warn(`[SleeperStatusAdapter] HTTP ${res.status} for ${key}`)
      return new Map()
    }
    const data = (await res.json()) as Record<string, { injury_status?: string | null }>
    const map = new Map<string, string>()
    for (const [pid, row] of Object.entries(data)) {
      const st = row?.injury_status?.trim()
      if (st) map.set(pid, st)
    }
    cache[key] = { at: Date.now(), map }
    return map
  } catch (e) {
    console.warn('[SleeperStatusAdapter] fetch failed:', e)
    return new Map()
  }
}

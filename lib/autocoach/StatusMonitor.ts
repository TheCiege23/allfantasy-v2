import { prisma } from '@/lib/prisma'

export type PlayerStatusUpdate = {
  playerId: string
  playerName: string
  sport: string
  newStatus: string
  source: string
  detectedAt: Date
  gameStartsAt?: Date
}

function sportKey(sport: string): string {
  return sport.trim().toUpperCase()
}

/** True if any game for this sport on the given calendar day (US Eastern) has kickoff in the past. */
export async function isGameSlateStarted(sport: string, slateDate: string): Promise<boolean> {
  const sk = sportKey(sport)
  const d = new Date(`${slateDate}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return false

  const start = new Date(d)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  const now = new Date()
  const games = await prisma.sportsGame.findMany({
    where: {
      sport: sk,
      startTime: { gte: start, lt: end },
    },
    select: { startTime: true },
    take: 200,
  })

  for (const g of games) {
    if (g.startTime && g.startTime < now) return true
  }
  return false
}

/** YYYY-MM-DD in UTC from Date */
export function toSlateDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Latest injury/status rows from `SportsPlayer` for the given external IDs.
 * Optional Sleeper confirmation can be layered on later; DB is the hot path for cron.
 */
export async function fetchLatestPlayerStatuses(
  sport: string,
  playerIds: string[]
): Promise<PlayerStatusUpdate[]> {
  if (playerIds.length === 0) return []
  const sk = sportKey(sport)
  const rows = await prisma.sportsPlayer.findMany({
    where: { sport: sk, externalId: { in: playerIds } },
    select: { externalId: true, name: true, status: true, sport: true, updatedAt: true },
  })
  const out: PlayerStatusUpdate[] = []
  for (const r of rows) {
    const st = (r.status ?? '').trim()
    if (!st) continue
    out.push({
      playerId: r.externalId,
      playerName: r.name,
      sport: r.sport,
      newStatus: st,
      source: 'sports_player_db',
      detectedAt: r.updatedAt ?? new Date(),
    })
  }
  return out
}

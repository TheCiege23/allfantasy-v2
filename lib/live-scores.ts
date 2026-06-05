import 'server-only'

import { prisma } from '@/lib/prisma'

export type LiveGameScore = {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: string
  quarter?: string | null
  clock?: string | null
  sport: string
  startTime: Date | null
}

/** Cache-only live scores: checks sportsGame table and never calls providers. */
export async function getLiveScores(sport: string, options?: { hoursBack?: number; limit?: number }): Promise<LiveGameScore[]> {
  const hoursBack = options?.hoursBack ?? 12
  const limit = options?.limit ?? 20
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

  try {
    const games = await prisma.sportsGame.findMany({
      where: {
        sport: sport.toUpperCase(),
        startTime: { gte: cutoff },
      },
      orderBy: { startTime: 'desc' },
      take: limit,
    })
    if (games.length > 0) {
      return games.map((g) => ({
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        homeScore: g.homeScore ?? 0,
        awayScore: g.awayScore ?? 0,
        status: g.status || 'scheduled',
        quarter: null,
        clock: null,
        sport: g.sport,
        startTime: g.startTime,
      }))
    }
  } catch {}

  return []
}

/** Check if any games are currently live for a sport. */
export async function hasLiveGames(sport: string): Promise<boolean> {
  const scores = await getLiveScores(sport, { hoursBack: 6, limit: 1 })
  return scores.some((g) => g.status.toLowerCase().includes('in progress') || g.status.toLowerCase().includes('live'))
}

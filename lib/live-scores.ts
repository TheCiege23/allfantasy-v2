import 'server-only'

import { prisma } from '@/lib/prisma'
import { fetchWithChain } from '@/lib/workers/api-chain'

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

/** DB-first live scores: checks sportsGame table (recent), then api-chain. */
export async function getLiveScores(sport: string, options?: { hoursBack?: number; limit?: number }): Promise<LiveGameScore[]> {
  const hoursBack = options?.hoursBack ?? 12
  const limit = options?.limit ?? 20
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

  // 1. Check sportsGame table
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

  // 2. API chain fallback
  const chain = await fetchWithChain({ sport: sport.toLowerCase(), dataType: 'scores' })
  if (Array.isArray(chain.data)) {
    return chain.data.slice(0, limit).map((g: any) => ({
      homeTeam: String(g.homeTeam ?? g.home_team ?? ''),
      awayTeam: String(g.awayTeam ?? g.away_team ?? ''),
      homeScore: Number(g.homeScore ?? g.home_score ?? 0),
      awayScore: Number(g.awayScore ?? g.away_score ?? 0),
      status: String(g.status ?? 'scheduled'),
      quarter: g.quarter ?? g.period ?? null,
      clock: g.clock ?? g.time ?? null,
      sport: sport.toUpperCase(),
      startTime: g.startTime ? new Date(g.startTime) : null,
    }))
  }

  return []
}

/** Check if any games are currently live for a sport. */
export async function hasLiveGames(sport: string): Promise<boolean> {
  const scores = await getLiveScores(sport, { hoursBack: 6, limit: 1 })
  return scores.some((g) => g.status.toLowerCase().includes('in progress') || g.status.toLowerCase().includes('live'))
}

import type { SportConfig } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { StatCategoryRow } from './types'

export function calculateFantasyPoints(
  rawStats: Record<string, number>,
  statCategories: SportConfig['statCategories'],
  scoringOverrides?: Record<string, number>,
): number {
  const cats = statCategories as unknown as StatCategoryRow[]
  if (!Array.isArray(cats)) return 0
  let sum = 0
  for (const cat of cats) {
    const v = rawStats[cat.key] ?? 0
    const mult = scoringOverrides?.[cat.key] ?? cat.points
    sum += v * mult
  }
  return sum
}

export async function updateMatchupScores(matchupId: string): Promise<void> {
  const m = await prisma.redraftMatchup.findFirst({
    where: { id: matchupId },
    include: {
      homeRoster: { include: { players: true } },
      awayRoster: { include: { players: true } },
    },
  })
  if (!m || !m.homeRoster || !m.awayRosterId) return

  const week = m.week
  const season = await prisma.redraftSeason.findFirst({ where: { id: m.seasonId } })
  if (!season) return

  async function sumStarters(rosterId: string): Promise<number> {
    const starters = await prisma.redraftRosterPlayer.findMany({
      where: {
        rosterId,
        droppedAt: null,
        slotType: { notIn: ['bench', 'taxi'] },
      },
    })
    let pts = 0
    for (const p of starters) {
      const row = await prisma.playerWeeklyScore.findUnique({
        where: {
          playerId_week_season_sport: {
            playerId: p.playerId,
            week,
            season: season.season,
            sport: p.sport,
          },
        },
      })
      pts += row?.fantasyPts ?? 0
    }
    return pts
  }

  const homePts = await sumStarters(m.homeRosterId)
  const awayPts = await sumStarters(m.awayRosterId)

  await prisma.redraftMatchup.update({
    where: { id: matchupId },
    data: {
      homeScore: homePts,
      awayScore: awayPts,
      status: 'active',
    },
  })
}

export async function lockPlayersAtGameStart(_sport: string, _week: number): Promise<void> {
  // Placeholder: wire to live stats provider (Rolling Insights / sport APIs).
}

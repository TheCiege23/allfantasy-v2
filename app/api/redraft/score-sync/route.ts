import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncWeeklyScores } from '@/lib/survivor/gameStateMachine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  // Placeholder: Rolling Insights / sport stats ingestion → PlayerWeeklyScore upserts.
  const survivorBridge = { synced: 0, failed: 0 }

  const survivorLeagues = await prisma.league.findMany({
    where: {
      survivorMode: true,
      survivorPhase: { in: ['pre_merge', 'post_swap', 'merge', 'post_merge', 'jury'] },
    },
    select: { id: true },
  })

  const results = await Promise.allSettled(
    survivorLeagues.map(async ({ id: leagueId }) => {
      const season = await prisma.redraftSeason.findFirst({
        where: { leagueId },
        orderBy: { createdAt: 'desc' },
      })
      const week = Math.max(1, season?.currentWeek ?? 1)
      await syncWeeklyScores(leagueId, week)
    }),
  )

  for (const r of results) {
    if (r.status === 'fulfilled') survivorBridge.synced++
    else survivorBridge.failed++
  }

  return NextResponse.json({
    updated: 0,
    matchupsRecalculated: 0,
    message: 'score-sync stub — connect stats provider',
    survivorBridge,
  })
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateC2CMatchupScores } from '@/lib/c2c/scoringEngine'
import { syncWeeklyScores } from '@/lib/survivor/gameStateMachine'
import { checkAllMatchupsComplete } from '@/lib/zombie/matchupCompletion'
import { runWeeklyResolution } from '@/lib/zombie/weeklyResolutionEngine'

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

  const zombieLeagues = await prisma.zombieLeague.findMany({
    where: { status: 'active' },
    select: { id: true, leagueId: true, currentWeek: true, season: true },
  })

  const zombieRes = await Promise.allSettled(
    zombieLeagues.map(async ({ id, leagueId, currentWeek, season }) => {
      const week = Math.max(1, currentWeek || 1)
      const allComplete = await checkAllMatchupsComplete(leagueId, week, season)
      if (!allComplete) return
      await runWeeklyResolution(id, week)
    }),
  )

  const c2cLeagues = await prisma.c2CLeague.findMany({ select: { leagueId: true } })
  let c2cMatchupsRecalculated = 0
  for (const { leagueId } of c2cLeagues) {
    const matchups = await prisma.redraftMatchup.findMany({
      where: {
        leagueId,
        status: { in: ['scheduled', 'active'] },
      },
      take: 120,
      select: { id: true },
    })
    for (const m of matchups) {
      try {
        await updateC2CMatchupScores(m.id)
        c2cMatchupsRecalculated++
      } catch {
        /* missing away roster / config */
      }
    }
  }

  return NextResponse.json({
    updated: 0,
    matchupsRecalculated: c2cMatchupsRecalculated,
    message: 'score-sync stub — connect stats provider',
    survivorBridge,
    zombieResolutionAttempts: zombieRes.length,
    zombieResolutionFailed: zombieRes.filter((r) => r.status === 'rejected').length,
    c2cLeaguesSynced: c2cLeagues.length,
  })
}

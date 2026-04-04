import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { prisma } from '@/lib/prisma'
import { validateLineup } from '@/lib/c2c/rosterEngine'
import { updateC2CMatchupScores } from '@/lib/c2c/scoringEngine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function run() {
  const leagues = await prisma.c2CLeague.findMany()
  let lineupsChecked = 0
  let invalidLineups = 0
  let matchupsUpdated = 0

  for (const L of leagues) {
    const rosters = await prisma.redraftRoster.findMany({
      where: { leagueId: L.leagueId },
      select: { id: true },
    })
    for (const r of rosters) {
      const v = await validateLineup(L.leagueId, r.id)
      lineupsChecked++
      if (!v.valid) invalidLineups++
    }

    const matchups = await prisma.redraftMatchup.findMany({
      where: { leagueId: L.leagueId, status: { in: ['scheduled', 'active'] } },
      take: 80,
      select: { id: true },
    })
    for (const m of matchups) {
      try {
        await updateC2CMatchupScores(m.id)
        matchupsUpdated++
      } catch {
        /* ignore */
      }
    }
  }

  return NextResponse.json({
    ok: true,
    c2cLeagues: leagues.length,
    lineupsChecked,
    invalidLineups,
    matchupsUpdated,
  })
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

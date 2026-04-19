import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { prisma } from '@/lib/prisma'
import { getAiQueue } from '@/lib/queues/bullmq'
import { isBestBallLeague } from '@/lib/autocoach/AutoCoachEngine'
import { toSlateDateUtc } from '@/lib/autocoach/StatusMonitor'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = toSlateDateUtc(new Date())

  const start = new Date(`${today}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  const gamesToday = await prisma.sportsGame.count({
    where: {
      startTime: { gte: start, lt: end },
    },
  })
  if (gamesToday === 0) {
    return NextResponse.json({ enqueuedLeagues: 0, note: 'no_games_today' })
  }

  const grouped = await prisma.autoCoachSetting.groupBy({
    by: ['leagueId'],
    where: { enabled: true, blockedByCommissioner: false },
  })

  const queue = getAiQueue()
  if (!queue) {
    return NextResponse.json({ enqueuedLeagues: 0, note: 'redis_not_configured' })
  }

  let delay = 0
  let enqueuedLeagues = 0

  for (const row of grouped) {
    const league = await prisma.league.findUnique({
      where: { id: row.leagueId },
      select: {
        id: true,
        sport: true,
        leagueVariant: true,
        bestBallMode: true,
        autoCoachEnabled: true,
      },
    })
    if (!league || league.autoCoachEnabled === false) continue
    if (isBestBallLeague(league.leagueVariant, league.bestBallMode)) continue

    const sk = normalizeToSupportedSport(String(league.sport))
    const sportGamesToday = await prisma.sportsGame.count({
      where: {
        sport: sk,
        startTime: { gte: start, lt: end },
      },
    })
    if (sportGamesToday === 0) continue

    await queue.add(
      `autocoach-pregame-${league.id}`,
      {
        type: 'autocoach_pregame_scan',
        leagueId: league.id,
        payload: { gameSlateDate: today, sport: sk },
      },
      { delay, removeOnComplete: true }
    )
    delay += 750
    enqueuedLeagues += 1
  }

  return NextResponse.json({ enqueuedLeagues, gameSlateDate: today })
}

/**
 * [NEW] app/api/schedule/calendar/route.ts
 * Generic multi-sport schedule calendar API.
 * Resolves the correct sport from the league, then returns combined real games + fantasy events.
 * Works for all 7 sports without needing sport-specific route knowledge.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveFantasyWeek } from '@/lib/fantasy-schedule'
import type { ScheduleSport } from '@/lib/fantasy-schedule'
import type { LeagueFormatId } from '@/lib/league/format-engine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  const season = parseInt(req.nextUrl.searchParams.get('season') ?? '', 10) || new Date().getFullYear()
  const startWeek = parseInt(req.nextUrl.searchParams.get('startWeek') ?? '1', 10)
  const endWeek = parseInt(req.nextUrl.searchParams.get('endWeek') ?? '4', 10)

  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, leagueVariant: true, leagueType: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const sport = league.sport.toUpperCase() as ScheduleSport
  const formatId = (league.leagueType ?? 'redraft') as LeagueFormatId

  const weeks = []
  for (let w = startWeek; w <= Math.min(endWeek, startWeek + 20); w++) {
    try {
      weeks.push(await resolveFantasyWeek({
        leagueId,
        sport,
        leagueFormatId: formatId,
        leagueVariant: league.leagueVariant,
        season,
        week: w,
      }))
    } catch { /* skip weeks with no data */ }
  }

  // Load real games for the date range
  const allDates = weeks.flatMap((w) => w.volumeProfile.days.map((d) => d.date))
  const minDate = allDates.sort()[0]
  const maxDate = allDates.sort().reverse()[0]

  let games: Array<{ date: string; homeTeam: string | null; awayTeam: string | null; startTime: string | null }> = []
  if (minDate && maxDate) {
    const rows = await prisma.gameSchedule.findMany({
      where: {
        sportType: sport,
        season,
        startTime: { gte: new Date(minDate), lte: new Date(maxDate + 'T23:59:59Z') },
      },
      select: { startTime: true, homeTeam: true, awayTeam: true },
      orderBy: { startTime: 'asc' },
    })
    games = rows.map((r) => ({
      date: r.startTime?.toISOString().slice(0, 10) ?? '',
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      startTime: r.startTime?.toISOString() ?? null,
    }))
  }

  return NextResponse.json({
    leagueId,
    season,
    sport,
    leagueType: formatId,
    leagueVariant: league.leagueVariant,
    weeks,
    games,
  })
}

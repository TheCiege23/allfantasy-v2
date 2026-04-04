import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { generateSchedule } from '@/lib/redraft/scheduleEngine'
import { leagueSportToConfigSport } from '@/lib/redraft/sportKey'
import { tryGetSportConfig } from '@/lib/sportConfig'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  if (!seasonId && !leagueId) {
    return NextResponse.json({ error: 'seasonId or leagueId required' }, { status: 400 })
  }

  const season = await prisma.redraftSeason.findFirst({
    where: seasonId ? { id: seasonId } : { leagueId: leagueId! },
    orderBy: seasonId ? undefined : { createdAt: 'desc' },
    include: { rosters: true },
  })
  if (!season) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = await assertLeagueMember(season.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  return NextResponse.json({ season })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    leagueId?: string
    sport?: string
    season?: number
    totalWeeks?: number
    playoffStartWeek?: number
    playoffTeams?: number
    medianGame?: boolean
    waiverType?: string
    waiverBudget?: number
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    include: { teams: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const sportKey = body.sport
    ? leagueSportToConfigSport(body.sport)
    : leagueSportToConfigSport(String(league.sport))
  const cfg = tryGetSportConfig(sportKey)
  const seasonYear = body.season ?? league.season
  const totalWeeks = body.totalWeeks ?? cfg?.defaultSeasonWeeks ?? 17
  const playoffStartWeek = body.playoffStartWeek ?? cfg?.defaultPlayoffStartWeek ?? 15
  const medianGame = body.medianGame ?? league.medianGame ?? false

  const redraft = await prisma.$transaction(async (tx) => {
    const rs = await tx.redraftSeason.create({
      data: {
        leagueId,
        sport: sportKey,
        season: seasonYear,
        status: 'setup',
        totalWeeks,
        playoffStartWeek,
        currentWeek: 0,
        medianGame,
      },
    })

    const rosters: { id: string }[] = []
    for (const t of league.teams) {
      const ownerId = t.claimedByUserId ?? league.userId
      const r = await tx.redraftRoster.create({
        data: {
          seasonId: rs.id,
          leagueId,
          ownerId,
          ownerName: t.ownerName,
          teamName: t.teamName,
          avatarUrl: t.avatarUrl,
        },
      })
      rosters.push({ id: r.id })
    }

    const slots = generateSchedule(rosters, totalWeeks, playoffStartWeek, sportKey, { medianGame })
    for (const s of slots) {
      if (s.type === 'median') continue
      await tx.redraftMatchup.create({
        data: {
          seasonId: rs.id,
          leagueId,
          week: s.week,
          type: 'regular',
          homeRosterId: s.home,
          awayRosterId: s.away,
          isMedianMatchup: false,
        },
      })
    }

    return tx.redraftSeason.findFirst({
      where: { id: rs.id },
      include: { rosters: true, schedule: true },
    })
  })

  return NextResponse.json({ season: redraft })
}

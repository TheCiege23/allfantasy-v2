import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { runBestBallOptimizer } from '@/lib/bestball/optimizer'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  const rosterId = req.nextUrl.searchParams.get('rosterId')?.trim()
  const week = Number(req.nextUrl.searchParams.get('week'))
  if (!seasonId || !rosterId || !Number.isFinite(week)) {
    return NextResponse.json({ error: 'seasonId, rosterId, week required' }, { status: 400 })
  }

  const roster = await prisma.redraftRoster.findFirst({
    where: { id: rosterId, seasonId },
    include: { season: true },
  })
  if (!roster) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = await assertLeagueMember(roster.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const row = await prisma.bestBallOptimizedLineup.findFirst({
    where: { seasonId, rosterId, week, entryId: null },
  })
  if (!row) return NextResponse.json({ error: 'No cached lineup' }, { status: 404 })
  return NextResponse.json({ lineup: row })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    rosterId?: string | null
    entryId?: string | null
    leagueId?: string | null
    contestId?: string | null
    seasonId?: string | null
    week?: number
    sport?: string
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const week = body.week
  if (week == null || !Number.isFinite(week)) {
    return NextResponse.json({ error: 'week required' }, { status: 400 })
  }

  if (body.rosterId) {
    const roster = await prisma.redraftRoster.findFirst({ where: { id: body.rosterId } })
    if (!roster) return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
    const gate = await assertLeagueMember(roster.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
    const season = await prisma.redraftSeason.findFirst({ where: { id: roster.seasonId } })
    const sport = normalizeToSupportedSport(body.sport ?? season?.sport ?? 'NFL')
    const lineup = await runBestBallOptimizer({
      rosterId: roster.id,
      leagueId: roster.leagueId,
      week,
      sport,
      seasonId: roster.seasonId,
    })
    return NextResponse.json({ lineup })
  }

  if (body.entryId) {
    const entry = await prisma.bestBallEntry.findFirst({ where: { id: body.entryId, userId } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    const contest = await prisma.bestBallContest.findFirst({ where: { id: entry.contestId } })
    const lineup = await runBestBallOptimizer({
      entryId: entry.id,
      leagueId: body.leagueId ?? null,
      week,
      sport: normalizeToSupportedSport(body.sport ?? contest?.sport ?? 'NFL'),
    })
    return NextResponse.json({ lineup })
  }

  return NextResponse.json({ error: 'rosterId or entryId required' }, { status: 400 })
}

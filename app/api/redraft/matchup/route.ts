import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { calculateOfficialTeamScore, leagueUsesDevyEngine } from '@/lib/devy/scoringEligibilityEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const matchupId = req.nextUrl.searchParams.get('matchupId')?.trim()
  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  const week = req.nextUrl.searchParams.get('week')

  if (matchupId) {
    const m = await prisma.redraftMatchup.findFirst({
      where: { id: matchupId },
      include: { homeRoster: true, awayRoster: true },
    })
    if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const gate = await assertLeagueMember(m.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
    return NextResponse.json({ matchup: m })
  }

  if (seasonId && week != null) {
    const w = Number(week)
    const season = await prisma.redraftSeason.findFirst({ where: { id: seasonId } })
    if (!season) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const gate = await assertLeagueMember(season.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

    const matchups = await prisma.redraftMatchup.findMany({
      where: { seasonId, week: w },
      include: { homeRoster: true, awayRoster: true },
    })
    if (await leagueUsesDevyEngine(season.leagueId)) {
      const devyScores: Record<
        string,
        { home: Awaited<ReturnType<typeof calculateOfficialTeamScore>>; away: Awaited<ReturnType<typeof calculateOfficialTeamScore>> | null }
      > = {}
      for (const mu of matchups) {
        const home = await calculateOfficialTeamScore(season.leagueId, mu.homeRosterId, w, season.season)
        const away = mu.awayRosterId
          ? await calculateOfficialTeamScore(season.leagueId, mu.awayRosterId, w, season.season)
          : null
        devyScores[mu.id] = { home, away }
      }
      return NextResponse.json({ matchups, devyScores })
    }
    return NextResponse.json({ matchups })
  }

  return NextResponse.json({ error: 'matchupId or seasonId+week required' }, { status: 400 })
}

import type { C2CMatchupScore } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { calculateOfficialTeamScore, leagueUsesDevyEngine } from '@/lib/devy/scoringEligibilityEngine'
import { leagueUsesC2CEngine } from '@/lib/c2c/scoringEngine'
import { getCanonicalNflMatchupContext } from '@/lib/nfl-data-foundation/nflDataFoundationService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const matchupId = req.nextUrl.searchParams?.get('matchupId')?.trim()
  const seasonId = req.nextUrl.searchParams?.get('seasonId')?.trim()
  const week = req.nextUrl.searchParams?.get('week')

  if (matchupId) {
    const m = await prisma.redraftMatchup.findFirst({
      where: { id: matchupId },
      include: { homeRoster: true, awayRoster: true, season: true },
    })
    if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const gate = await assertLeagueMember(m.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
    const canonicalNflMatchup =
      String(m.season.sport).toUpperCase() === 'NFL'
        ? await getCanonicalNflMatchupContext({ matchupId: m.id }).catch(() => null)
        : null
    return NextResponse.json({ matchup: m, canonicalNflMatchup })
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
    const canonicalNflMatchups =
      String(season.sport).toUpperCase() === 'NFL'
        ? Object.fromEntries(
            await Promise.all(
              matchups.map(async (mu: { id: string }) => [
                mu.id,
                await getCanonicalNflMatchupContext({ matchupId: mu.id }).catch(() => null),
              ]),
            ),
          )
        : null
    if (await leagueUsesC2CEngine(season.leagueId)) {
      const c2cScores: Record<string, { home: C2CMatchupScore | null; away: C2CMatchupScore | null }> = {}
      for (const mu of matchups) {
        const home = await prisma.c2CMatchupScore.findUnique({
          where: {
            leagueId_matchupId_rosterId: {
              leagueId: season.leagueId,
              matchupId: mu.id,
              rosterId: mu.homeRosterId,
            },
          },
        })
        const away = mu.awayRosterId
          ? await prisma.c2CMatchupScore.findUnique({
              where: {
                leagueId_matchupId_rosterId: {
                  leagueId: season.leagueId,
                  matchupId: mu.id,
                  rosterId: mu.awayRosterId,
                },
              },
            })
          : null
        c2cScores[mu.id] = { home, away }
      }
      return NextResponse.json({ matchups, c2cScores, canonicalNflMatchups })
    }
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
      return NextResponse.json({ matchups, devyScores, canonicalNflMatchups })
    }
    return NextResponse.json({ matchups, canonicalNflMatchups })
  }

  return NextResponse.json({ error: 'matchupId or seasonId+week required' }, { status: 400 })
}


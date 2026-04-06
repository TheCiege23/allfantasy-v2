import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateAndSaveRank } from '@/lib/rank/calculateRank'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface LeagueRecord {
  platformLeagueId: string
  name: string
  season: number
  leagueSize: number
  importWins: number
  importLosses: number
  importTies: number
  importMadePlayoffs: boolean
  importWonChampionship: boolean
  importFinalStanding: number | null
  importPointsFor: number | null
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = (await req.json().catch(() => ({}))) as {
      season?: number
      leagues?: LeagueRecord[]
      sleeperUserId?: string
      isLastSeason?: boolean
    }

    const { season, leagues, sleeperUserId, isLastSeason } = body

    if (season == null || !Array.isArray(leagues)) {
      return NextResponse.json({ error: 'season and leagues required' }, { status: 400 })
    }

    if (typeof sleeperUserId === 'string' && sleeperUserId.trim()) {
      await prisma.userProfile
        .upsert({
          where: { userId },
          update: { sleeperUserId: sleeperUserId.trim() },
          create: { userId, sleeperUserId: sleeperUserId.trim() },
        })
        .catch(() => {})
    }

    let saved = 0
    for (const league of leagues) {
      try {
        const pf =
          league.importPointsFor != null && Number.isFinite(league.importPointsFor)
            ? league.importPointsFor
            : null
        await prisma.league.upsert({
          where: {
            userId_platform_platformLeagueId_season: {
              userId,
              platform: 'sleeper',
              platformLeagueId: String(league.platformLeagueId),
              season: league.season,
            },
          },
          update: {
            name: league.name,
            leagueSize: league.leagueSize,
            importWins: league.importWins,
            importLosses: league.importLosses,
            importTies: league.importTies ?? 0,
            importMadePlayoffs: league.importMadePlayoffs,
            importWonChampionship: league.importWonChampionship,
            importFinalStanding: league.importFinalStanding,
            importPointsFor: pf,
            importedAt: new Date(),
          },
          create: {
            userId,
            platform: 'sleeper',
            platformLeagueId: String(league.platformLeagueId),
            name: league.name,
            season: league.season,
            leagueSize: league.leagueSize,
            importWins: league.importWins,
            importLosses: league.importLosses,
            importTies: league.importTies ?? 0,
            importMadePlayoffs: league.importMadePlayoffs,
            importWonChampionship: league.importWonChampionship,
            importFinalStanding: league.importFinalStanding,
            importPointsFor: pf,
            importedAt: new Date(),
          },
        })
        saved++
      } catch (e) {
        console.error(`[import/batch] league ${league.platformLeagueId}:`, e)
      }
    }

    const rankResult = await calculateAndSaveRank(userId).catch(() => null)

    return NextResponse.json({
      success: true,
      season,
      saved,
      rankTier: rankResult?.rankTier ?? null,
      xpLevel: rankResult?.xpLevel ?? null,
      xpTotal: rankResult?.xpTotal ?? null,
      isLastSeason: isLastSeason === true,
    })
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err))
    console.error('[import/batch]', e.message, e.stack)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

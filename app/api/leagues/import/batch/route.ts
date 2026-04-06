import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateAndSaveRank } from '@/lib/rank/calculateRank'
import { runWithConcurrency } from '@/lib/async-utils'

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

type SleeperLeagueApi = {
  league_id?: string
  name?: string
  total_rosters?: number
  settings?: {
    playoff_teams?: number
    num_teams?: number
  }
}

type SleeperRosterApi = {
  owner_id?: string
  co_owners?: string[]
  settings?: Record<string, unknown>
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toIntegerOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (value == null) return null
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : null
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
      sleeperUsername?: string
      isLastSeason?: boolean
    }

    const { season, leagues, sleeperUserId, sleeperUsername, isLastSeason } = body

    if (season == null || !Array.isArray(leagues)) {
      return NextResponse.json({ error: 'season and leagues required' }, { status: 400 })
    }
    if (leagues.length > 200) {
      return NextResponse.json({ error: 'Too many leagues in one request (max 200)' }, { status: 400 })
    }

    const sleeperUserIdTrimmed = typeof sleeperUserId === 'string' ? sleeperUserId.trim() : ''
    const sleeperUsernameTrimmed = typeof sleeperUsername === 'string' ? sleeperUsername.trim() : ''
    const existingProfile = await prisma.userProfile
      .findUnique({
        where: { userId },
        select: { sleeperUserId: true },
      })
      .catch(() => null)
    const resolvedSleeperUserId = sleeperUserIdTrimmed || existingProfile?.sleeperUserId?.trim() || ''

    if (!resolvedSleeperUserId) {
      return NextResponse.json({ error: 'sleeperUserId required' }, { status: 400 })
    }

    await prisma.userProfile.upsert({
      where: { userId },
      update: {
        sleeperUserId: resolvedSleeperUserId,
        ...(sleeperUsernameTrimmed ? { sleeperUsername: sleeperUsernameTrimmed.toLowerCase() } : {}),
        sleeperLinkedAt: new Date(),
      },
      create: {
        userId,
        sleeperUserId: resolvedSleeperUserId,
        ...(sleeperUsernameTrimmed ? { sleeperUsername: sleeperUsernameTrimmed.toLowerCase() } : {}),
        sleeperLinkedAt: new Date(),
      },
    })

    const userLeaguesRes = await fetch(
      `https://api.sleeper.app/v1/user/${encodeURIComponent(resolvedSleeperUserId)}/leagues/nfl/${season}`,
      { headers: { 'User-Agent': 'AllFantasy/1.0', Accept: 'application/json' } }
    )
    if (!userLeaguesRes.ok) {
      return NextResponse.json({ error: 'Failed to verify Sleeper leagues' }, { status: 502 })
    }
    const sleeperLeagues = (await userLeaguesRes.json().catch(() => [])) as SleeperLeagueApi[]
    const leaguesById = new Map<string, SleeperLeagueApi>(
      Array.isArray(sleeperLeagues)
        ? sleeperLeagues
            .filter((row) => typeof row?.league_id === 'string' && row.league_id.length > 0)
            .map((row) => [String(row.league_id), row])
        : []
    )

    const saveResults = await runWithConcurrency(leagues, 8, async (league) => {
      try {
        const platformLeagueId = String(league.platformLeagueId ?? '')
        if (!platformLeagueId) return 0

        const sleeperLeague = leaguesById.get(platformLeagueId)
        if (!sleeperLeague) return 0

        const rosterRes = await fetch(
          `https://api.sleeper.app/v1/league/${encodeURIComponent(platformLeagueId)}/rosters`,
          {
            headers: { 'User-Agent': 'AllFantasy/1.0', Accept: 'application/json' },
            signal: AbortSignal.timeout(4500),
          }
        ).catch(() => null)
        if (!rosterRes?.ok) return 0
        const rosters = (await rosterRes.json().catch(() => [])) as SleeperRosterApi[]
        const mine = Array.isArray(rosters)
          ? rosters.find((row) => {
              const ownerId = row?.owner_id != null ? String(row.owner_id) : ''
              const coOwners = Array.isArray(row?.co_owners) ? row.co_owners.map(String) : []
              return ownerId === resolvedSleeperUserId || coOwners.includes(resolvedSleeperUserId)
            })
          : null

        const totalTeams =
          typeof sleeperLeague.total_rosters === 'number' && sleeperLeague.total_rosters >= 1
            ? sleeperLeague.total_rosters
            : typeof sleeperLeague.settings?.num_teams === 'number' && sleeperLeague.settings.num_teams >= 1
              ? sleeperLeague.settings.num_teams
              : 12
        const playoffTeams =
          typeof sleeperLeague.settings?.playoff_teams === 'number' && sleeperLeague.settings.playoff_teams >= 1
            ? sleeperLeague.settings.playoff_teams
            : Math.max(1, Math.ceil(totalTeams / 3))

        const settings = (mine?.settings ?? {}) as Record<string, unknown>
        const wins = toNumber(settings.wins, 0)
        const losses = toNumber(settings.losses, 0)
        const ties = toNumber(settings.ties, 0)
        const finalStanding = toIntegerOrNull(settings.final_standing ?? settings.rank)
        const madePlayoffs = finalStanding != null ? finalStanding <= playoffTeams : false
        const wonChampionship = finalStanding === 1
        const fpts = toNumber(settings.fpts, NaN)
        const fptsDecimal = toNumber(settings.fpts_decimal, 0)
        const pf = Number.isFinite(fpts) ? fpts + fptsDecimal / 100 : null

        await prisma.league.upsert({
          where: {
            userId_platform_platformLeagueId_season: {
              userId,
              platform: 'sleeper',
              platformLeagueId,
              season,
            },
          },
          update: {
            name: sleeperLeague.name ?? league.name,
            leagueSize: totalTeams,
            importWins: wins,
            importLosses: losses,
            importTies: ties,
            importMadePlayoffs: madePlayoffs,
            importWonChampionship: wonChampionship,
            importFinalStanding: finalStanding,
            importPointsFor: pf,
            importedAt: new Date(),
          },
          create: {
            userId,
            platform: 'sleeper',
            platformLeagueId,
            name: sleeperLeague.name ?? league.name,
            season,
            leagueSize: totalTeams,
            importWins: wins,
            importLosses: losses,
            importTies: ties,
            importMadePlayoffs: madePlayoffs,
            importWonChampionship: wonChampionship,
            importFinalStanding: finalStanding,
            importPointsFor: pf,
            importedAt: new Date(),
          },
        })
        return 1
      } catch (e) {
        console.error(`[import/batch] league ${league.platformLeagueId}:`, e)
        return 0
      }
    })
    const saved = saveResults.reduce((sum, value) => sum + value, 0)

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

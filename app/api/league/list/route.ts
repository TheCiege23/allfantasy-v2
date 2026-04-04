import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import {
  isRealLeague,
  EXCLUDED_VARIANTS,
} from '@/lib/leagues/leagueListFilter'

export const dynamic = 'force-dynamic'

const VARIANT_NOT_IN = Array.from(EXCLUDED_VARIANTS)

function extractEntryFeeUsd(settings: unknown): number | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const o = settings as Record<string, unknown>
  const keys = ['entryFee', 'entry_fee', 'buyIn', 'buy_in', 'buyInAmount', 'entry_fee_usd']
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v
  }
  return null
}

function computeUserRole(
  platform: string,
  isCommissioner: boolean
): 'commissioner' | 'member' | 'imported' {
  const p = String(platform || '').toLowerCase()
  if (isCommissioner) return 'commissioner'
  if (p !== 'allfantasy' && p !== 'af') return 'imported'
  return 'member'
}

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { sleeperUserId: true },
    })

    const [genericLeagues, sleeperLeagues] = await Promise.all([
      (prisma as any).league.findMany({
        where: {
          userId,
          name: { not: null },
          AND: [
            {
              OR: [{ leagueVariant: null }, { leagueVariant: { notIn: VARIANT_NOT_IN } }],
            },
          ],
        },
        orderBy: [{ season: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          sport: true,
          leagueVariant: true,
          platform: true,
          platformLeagueId: true,
          leagueSize: true,
          season: true,
          status: true,
          avatarUrl: true,
          scoring: true,
          isDynasty: true,
          settings: true,
          syncStatus: true,
          syncError: true,
          lastSyncedAt: true,
          createdAt: true,
          isCommissioner: true,
          rosters: {
            select: {
              id: true,
              platformUserId: true,
              playerData: true,
              faabRemaining: true,
            },
          },
        },
      }),
      (prisma as any).sleeperLeague.findMany({
        where: {
          userId,
          totalTeams: { gt: 0 },
        },
        orderBy: { lastSyncedAt: 'desc' },
        select: {
          id: true,
          name: true,
          sleeperLeagueId: true,
          totalTeams: true,
          season: true,
          status: true,
          isDynasty: true,
          scoringType: true,
          syncStatus: true,
          syncError: true,
          lastSyncedAt: true,
          createdAt: true,
          rosters: {
            select: {
              id: true,
              ownerId: true,
              rosterId: true,
              players: true,
              starters: true,
              bench: true,
              faabRemaining: true,
              waiverPriority: true,
            },
          },
        },
      }),
    ])

    const sleeperGenericSorted = genericLeagues
      .filter((lg: any) => lg.platform === 'sleeper' && typeof lg.platformLeagueId === 'string')
      .sort((a: any, b: any) => (b.season ?? 0) - (a.season ?? 0))
    const unifiedSleeperLeagueIdMap = new Map<string, string>()
    for (const lg of sleeperGenericSorted) {
      if (!unifiedSleeperLeagueIdMap.has(lg.platformLeagueId)) {
        unifiedSleeperLeagueIdMap.set(lg.platformLeagueId, lg.id)
      }
    }

    const normalizedGeneric = genericLeagues.map((lg: any) => {
      const rosterCount = Array.isArray(lg.rosters) ? lg.rosters.length : 0
      const teamCountForFilter =
        typeof lg.leagueSize === 'number' && lg.leagueSize > 0
          ? lg.leagueSize
          : rosterCount > 0
            ? rosterCount
            : 0
      const entryFee = extractEntryFeeUsd(lg.settings)
      const isPaid = entryFee != null && entryFee > 0
      const p = String(lg.platform || '').toLowerCase()
      const isCommissioner = Boolean(lg.isCommissioner) || p === 'allfantasy' || p === 'af'
      const userRole = computeUserRole(lg.platform, isCommissioner)

      return {
        ...lg,
        sport_type: lg.sport ?? DEFAULT_SPORT,
        league_variant: lg.leagueVariant ?? null,
        navigationLeagueId: lg.id,
        unifiedLeagueId: lg.id,
        hasUnifiedRecord: true,
        teamCount: teamCountForFilter,
        isCommissioner,
        userRole,
        isPaid,
        entryFee: entryFee ?? null,
      }
    })

    const normalizedSleeper = sleeperLeagues
      .map((lg: any) => {
        const unifiedLeagueId = unifiedSleeperLeagueIdMap.get(lg.sleeperLeagueId) ?? null
        return {
          id: lg.id,
          name: lg.name,
          sport: DEFAULT_SPORT,
          sport_type: DEFAULT_SPORT,
          league_variant: null,
          platform: 'sleeper',
          platformLeagueId: lg.sleeperLeagueId,
          leagueSize: lg.totalTeams,
          teamCount: lg.totalTeams,
          avatarUrl: null,
          scoring: lg.scoringType,
          isDynasty: lg.isDynasty,
          syncStatus: lg.syncStatus,
          syncError: lg.syncError,
          lastSyncedAt: lg.lastSyncedAt,
          createdAt: lg.createdAt,
          season: lg.season,
          status: lg.status,
          navigationLeagueId: unifiedLeagueId,
          unifiedLeagueId,
          hasUnifiedRecord: Boolean(unifiedLeagueId),
          isCommissioner: false,
          userRole: 'imported' as const,
          isPaid: false,
          entryFee: null,
          rosters: lg.rosters.map((r: any) => ({
            id: r.id,
            platformUserId: r.ownerId,
            players: r.players,
            starters: r.starters,
            bench: r.bench,
            faabRemaining: r.faabRemaining,
            waiverPriority: r.waiverPriority,
          })),
        }
      })
      .filter((lg: any) => !lg.hasUnifiedRecord)

    const filteredGeneric = normalizedGeneric.filter(isRealLeague)
    const filteredSleeper = normalizedSleeper.filter(isRealLeague)

    const leagues = [...filteredGeneric, ...filteredSleeper].sort((a: any, b: any) => {
      const aDate = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0
      const bDate = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0
      return bDate - aDate
    })

    return NextResponse.json({
      leagues,
      sleeperUserId: profile?.sleeperUserId ?? null,
    })
  } catch (error: any) {
    console.error('[League List]', error)
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 })
  }
}

/**
 * Shared league list for `/api/league/list` and dashboard SSR so My Leagues hydrates
 * immediately without waiting for a client-side fetch.
 */
import { prisma } from '@/lib/prisma'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import { isRealLeague, EXCLUDED_VARIANTS } from '@/lib/leagues/leagueListFilter'

const VARIANT_NOT_IN = Array.from(EXCLUDED_VARIANTS)

function normalizeSleeperScoring(raw: string | null | undefined): string {
  const s = (raw ?? '').toLowerCase().trim()
  if (s === 'ppr') return 'PPR'
  if (s === 'half_ppr' || s === '0.5_ppr') return 'Half-PPR'
  return 'Standard'
}

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

export type DashboardLeagueListPayload = {
  leagues: unknown[]
  sleeperUserId: string | null
}

export async function getDashboardLeagueListForUser(userId: string): Promise<DashboardLeagueListPayload> {
  const profile = await prisma.userProfile
    .findUnique({
      where: { userId },
      select: { sleeperUserId: true },
    })
    .catch(() => null)

  const [genericLeagues, sleeperLeagues] = await Promise.all([
    (prisma as any).league
      .findMany({
        where: {
          userId,
          name: { not: null },
          AND: [
            {
              OR: [{ leagueVariant: null }, { leagueVariant: { notIn: VARIANT_NOT_IN } }],
            },
            {
              NOT: {
                AND: [
                  { platform: 'sleeper' },
                  { leagueVariant: null },
                  {
                    OR: [
                      { status: null },
                      { importWins: { not: null } },
                      { importLosses: { not: null } },
                      { importFinalStanding: { not: null } },
                    ],
                  },
                ],
              },
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
      })
      .catch((err: unknown) => {
        console.error('[League List] generic leagues query failed', err)
        return []
      }),
    (prisma as any).sleeperLeague
      .findMany({
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
      })
      .catch((err: unknown) => {
        console.error('[League List] sleeper leagues query failed', err)
        return []
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
        scoring: normalizeSleeperScoring(lg.scoringType),
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
        rosters: (Array.isArray(lg.rosters) ? lg.rosters : []).map((r: any) => ({
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

  const normalizedGenericFiltered = normalizedGeneric.filter(isRealLeague)
  const normalizedSleeperFiltered = normalizedSleeper.filter(isRealLeague)
  const filtered = [...normalizedGenericFiltered, ...normalizedSleeperFiltered]

  const leaguesSorted = filtered.sort((a: any, b: any) => {
    const aDate = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0
    const bDate = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0
    return bDate - aDate
  })

  return {
    leagues: leaguesSorted,
    sleeperUserId: profile?.sleeperUserId ?? null,
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DEFAULT_SPORT } from '@/lib/sport-scope';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { sleeperUserId: true },
    });

    const [genericLeagues, sleeperLeagues] = await Promise.all([
      (prisma as any).league.findMany({
        where: { userId },
        orderBy: { lastSyncedAt: 'desc' },
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
        where: { userId },
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
    ]);

    const unifiedSleeperLeagueIdMap = new Map(
      genericLeagues
        .filter((lg: any) => lg.platform === 'sleeper' && typeof lg.platformLeagueId === 'string')
        .map((lg: any) => [lg.platformLeagueId, lg.id] as const)
    );

    const normalizedGeneric = genericLeagues.map((lg: any) => ({
      ...lg,
      sport_type: lg.sport ?? DEFAULT_SPORT,
      league_variant: lg.leagueVariant ?? null,
      navigationLeagueId: lg.id,
      unifiedLeagueId: lg.id,
      hasUnifiedRecord: true,
    }));

    const normalizedSleeper = sleeperLeagues
      .map((lg: any) => {
        const unifiedLeagueId = unifiedSleeperLeagueIdMap.get(lg.sleeperLeagueId) ?? null;
        return {
          id: lg.id,
          name: lg.name,
          sport: DEFAULT_SPORT,
          sport_type: DEFAULT_SPORT,
          league_variant: null,
          platform: 'sleeper',
          platformLeagueId: lg.sleeperLeagueId,
          leagueSize: lg.totalTeams,
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
          rosters: lg.rosters.map((r: any) => ({
            id: r.id,
            platformUserId: r.ownerId,
            players: r.players,
            starters: r.starters,
            bench: r.bench,
            faabRemaining: r.faabRemaining,
            waiverPriority: r.waiverPriority,
          })),
        };
      })
      .filter((lg: any) => !lg.hasUnifiedRecord);

    const leagues = [...normalizedGeneric, ...normalizedSleeper]
      .sort((a: any, b: any) => {
        const aDate = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0;
        const bDate = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0;
        return bDate - aDate;
      });

    return NextResponse.json({
      leagues,
      sleeperUserId: profile?.sleeperUserId ?? null,
    });
  } catch (error: any) {
    console.error('[League List]', error);
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 });
  }
}

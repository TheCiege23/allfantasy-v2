import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const team = url.searchParams?.get('team');
  const season = url.searchParams?.get('season');
  const seasonType = url.searchParams?.get('seasonType') || 'regular';
  const refresh = url.searchParams?.get('refresh') === 'true';

  try {
    const where: Record<string, unknown> = {
      sport: 'NFL',
      seasonType,
    };
    if (team) where.team = team.toUpperCase();
    if (season) where.season = season;

    const stats = await prisma.teamSeasonStats.findMany({
      where,
      orderBy: [{ team: 'asc' }, { season: 'desc' }],
    });

    const stale = stats.length === 0 || (stats.length > 0 && stats[0].expiresAt < new Date());

    return NextResponse.json({
      stats,
      synced: false,
      refreshed: false,
      refreshIgnored: refresh,
      isStale: stale,
      lastSyncedAt: stats[0]?.fetchedAt?.toISOString() ?? null,
      message: stale
        ? 'Cached NFL team stats are stale or missing. Admin/cron sync must refresh provider data.'
        : null,
    });
  } catch (error: any) {
    console.error('[team-stats] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


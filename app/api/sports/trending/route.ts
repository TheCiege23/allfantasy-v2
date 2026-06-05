import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sport = url.searchParams?.get('sport') || 'nfl';
  const signal = url.searchParams?.get('signal');
  const position = url.searchParams?.get('position');
  const limit = Math.min(100, parseInt(url.searchParams?.get('limit') || '50'));
  const refresh = url.searchParams?.get('refresh') === 'true';

  try {
    const where: Record<string, unknown> = { sport };
    if (signal) where.crowdSignal = signal;
    if (position) where.position = position.toUpperCase();

    const players = await prisma.trendingPlayer.findMany({
      where,
      orderBy: { crowdScore: 'desc' },
      take: limit,
    });

    const stale = players.length === 0 || players[0].expiresAt < new Date();

    return NextResponse.json({
      players,
      synced: false,
      refreshed: false,
      refreshIgnored: refresh,
      isStale: stale,
      lastSyncedAt: players[0]?.fetchedAt?.toISOString() ?? null,
      message: stale
        ? 'Cached trending players are stale or missing. Admin/cron sync must refresh provider data.'
        : null,
      count: players.length,
    });
  } catch (error: any) {
    console.error('[trending] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


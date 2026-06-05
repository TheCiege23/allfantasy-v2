import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const team = url.searchParams?.get('team');
  const position = url.searchParams?.get('position');
  const refresh = url.searchParams?.get('refresh') === 'true';

  try {
    const where: Record<string, unknown> = { sport: 'NFL' };
    if (team) where.team = team.toUpperCase();
    if (position) where.position = position.toUpperCase();

    const charts = await prisma.depthChart.findMany({
      where,
      orderBy: [{ team: 'asc' }, { position: 'asc' }],
    });

    const stale = charts.length === 0 || (charts.length > 0 && charts[0].expiresAt < new Date());

    return NextResponse.json({
      charts,
      synced: false,
      refreshed: false,
      refreshIgnored: refresh,
      isStale: stale,
      lastSyncedAt: charts[0]?.fetchedAt?.toISOString() ?? null,
      message: stale
        ? 'Cached NFL depth charts are stale or missing. Admin/cron sync must refresh provider data.'
        : null,
    });
  } catch (error: any) {
    console.error('[depth-charts] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


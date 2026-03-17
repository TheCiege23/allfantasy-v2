import { NextRequest, NextResponse } from 'next/server';
import { getEnrichedNewsFeed } from '@/lib/fantasy-news-aggregator';
import { SUPPORTED_SPORTS } from '@/lib/sport-scope';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sport = searchParams.get('sport') || 'NFL';
  const player = searchParams.get('player')?.trim();
  const refresh = searchParams.get('refresh') === 'true';
  const enrich = searchParams.get('enrich') !== 'false';
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50);

  const sportNorm = SUPPORTED_SPORTS.includes(sport as any) ? sport : 'NFL';

  try {
    const items = await getEnrichedNewsFeed({
      sport: sportNorm,
      playerQuery: player || undefined,
      limit,
      refresh,
      enrich,
    });
    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    console.error('[fantasy-news/feed]', e);
    return NextResponse.json(
      { error: 'Failed to fetch news feed', items: [], count: 0 },
      { status: 500 }
    );
  }
}

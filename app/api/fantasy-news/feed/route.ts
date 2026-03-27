import { NextRequest, NextResponse } from 'next/server';
import {
  getEnrichedNewsFeed,
  type FeedType,
} from '@/lib/fantasy-news-aggregator';
import { normalizeToSupportedSport } from '@/lib/sport-scope';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sport = normalizeToSupportedSport(searchParams.get('sport') || 'NFL');
  const typeRaw = searchParams.get('type')?.trim().toLowerCase();
  const type = typeRaw === 'player' || typeRaw === 'team' ? typeRaw : null;
  const query = searchParams.get('query')?.trim() || null;
  // Backward compatibility for old player param callers.
  const legacyPlayer = searchParams.get('player')?.trim() || null;
  const refresh = searchParams.get('refresh') === 'true';
  const summarizeParam = searchParams.get('summarize');
  const enrichParam = searchParams.get('enrich');
  const enrich =
    enrichParam != null
      ? enrichParam !== 'false'
      : summarizeParam != null
        ? summarizeParam !== 'false'
        : true;
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50);
  const effectiveType: FeedType | null = type ?? (legacyPlayer ? 'player' : query ? 'player' : null);
  const effectiveQuery = (query ?? legacyPlayer)?.trim() || null;

  try {
    if ((effectiveType === 'player' || effectiveType === 'team') && !effectiveQuery) {
      return NextResponse.json({ error: 'Query is required for player/team feeds' }, { status: 400 });
    }

    const items = await getEnrichedNewsFeed({
      sport,
      feedType: effectiveType ?? 'sport',
      playerQuery: effectiveType === 'player' ? effectiveQuery ?? undefined : undefined,
      teamQuery: effectiveType === 'team' ? effectiveQuery ?? undefined : undefined,
      refresh,
      limit,
      enrich,
    });

    return NextResponse.json({
      items,
      count: items.length,
    });
  } catch (e) {
    console.error('[fantasy-news/feed]', e);
    return NextResponse.json(
      { error: 'Failed to fetch news feed', items: [], count: 0 },
      { status: 500 }
    );
  }
}

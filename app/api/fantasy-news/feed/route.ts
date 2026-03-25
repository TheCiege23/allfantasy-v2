import { NextRequest, NextResponse } from 'next/server';
import {
  getAggregatedFeed,
  getNewsFeedBySport,
  summarizeHeadlines,
  type FeedType,
  type NewsFeedItem,
} from '@/lib/fantasy-news-aggregator';
import type { EnrichedNewsItem, ConfidenceLevel } from '@/lib/fantasy-news-aggregator/types';
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
  const summarize = searchParams.get('summarize') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 50);
  const effectiveType: FeedType | null = type ?? (legacyPlayer ? 'player' : null);
  const effectiveQuery = query ?? legacyPlayer;

  try {
    let baseItems: NewsFeedItem[] = [];
    if (effectiveType && effectiveQuery) {
      baseItems = await getAggregatedFeed(effectiveType, effectiveQuery, limit, { refresh, sport });
    } else if (!effectiveType && !effectiveQuery) {
      baseItems = await getNewsFeedBySport(sport, limit, { refresh });
    } else {
      return NextResponse.json(
        { error: 'When using query, provide type=player or type=team' },
        { status: 400 }
      );
    }

    const summarizedHeadlines = summarize
      ? await summarizeHeadlines(baseItems.map((item) => ({ id: item.id, title: item.title })))
      : undefined;
    const items = baseItems.map((item, index) =>
      toEnrichedItem(item, index, summarizedHeadlines?.[item.id] ?? null)
    );

    return NextResponse.json({
      items,
      summarizedHeadlines: summarizedHeadlines ?? undefined,
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

function toEnrichedItem(
  item: NewsFeedItem,
  index: number,
  summarizedHeadline: string | null
): EnrichedNewsItem {
  const playersMentioned = Array.from(
    new Set(
      [item.playerName, ...(item.playerNames ?? [])]
        .map((name) => name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  );
  const headline = summarizedHeadline ?? item.title;

  return {
    ...item,
    headline,
    summary: item.description,
    fantasyImpact: null,
    confidenceLevel: 'medium' as ConfidenceLevel,
    // Keep ranking deterministic and recency-biased for banner ordering.
    importanceScore: Math.max(0, 100 - index * 3),
    newsType: null,
    playersMentioned,
  };
}

import { withApiUsage } from "@/lib/telemetry/usage"
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeTeamAbbrev } from '@/lib/team-abbrev';
import { parseSportsRouteSportParam } from '@/lib/sports-route-params';
import {
  buildApiCacheKey,
  getApiCached,
  setApiCached,
  API_CACHE_TTL,
  parseCursorPageParams,
  encodeCursor,
  cacheControlHeaders,
} from '@/lib/api-performance';

export const dynamic = 'force-dynamic';

export const GET = withApiUsage({ endpoint: "/api/sports/news", tool: "SportsNews" })(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const team = searchParams?.get('team');
    const category = searchParams?.get('category');
    const source = searchParams?.get('source');
    const sentiment = searchParams?.get('sentiment');
    const player = searchParams?.get('player');
    const sportParam = searchParams?.get('sport');

    let parsedSport: ReturnType<typeof parseSportsRouteSportParam>;
    try {
      parsedSport = parseSportsRouteSportParam(sportParam);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Unsupported sport',
          message: error instanceof Error ? error.message : 'Unsupported sport',
          supportedSports: ['nfl', 'mlb', 'nba', 'nhl', 'ncaaf', 'ncaab', 'soccer', 'world-cup'],
        },
        { status: 400 }
      );
    }

    const { limit, cursor } = parseCursorPageParams(request, 100);

    const cacheKey = buildApiCacheKey('GET', request.url, { excludeParams: ['refresh', '_t'] });
    const cached = getApiCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached.body, {
        status: cached.status,
        headers: { ...cached.headers, 'X-Cache': 'HIT' },
      });
    }

    const andConditions: any[] = [];

    const where: Record<string, unknown> = {
      sport: parsedSport.sport,
    };

    if (team) {
      const normalized = normalizeTeamAbbrev(team) || team;
      andConditions.push({
        OR: [
          { team: normalized },
          { teams: { has: normalized } },
        ],
      });
    }

    if (source) {
      where.source = source;
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    if (sentiment) {
      where.sentiment = sentiment;
    }

    if (player) {
      andConditions.push({
        OR: [
          { playerName: { contains: player, mode: 'insensitive' } },
          { playerNames: { has: player } },
          { title: { contains: player, mode: 'insensitive' } },
        ],
      });
    }

    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
        const cursorDate = new Date(decoded);
        if (!Number.isNaN(cursorDate.getTime())) {
          andConditions.push({ publishedAt: { lt: cursorDate } });
        }
      } catch { /* ignore invalid cursor */ }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const take = limit + 1;
    const news = await prisma.sportsNews.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take,
    });

    const latest = news[0] ?? null;
    const stale = latest ? latest.expiresAt < new Date() : false;

    const hasMore = news.length > limit;
    const items = hasMore ? news.slice(0, limit) : news;
    const lastPublished = items.length > 0 ? items[items.length - 1].publishedAt : null;
    const nextCursor = hasMore && lastPublished != null
      ? encodeCursor(lastPublished)
      : null;

    const sources = [...new Set(items.map(n => n.source))];
    const categories = [...new Set(items.map(n => n.category).filter(Boolean))];
    const sentiments = [...new Set(items.map(n => n.sentiment).filter(Boolean))];

    const body = {
      news: items,
      count: items.length,
      sport: parsedSport.sport,
      requestedSport: parsedSport.requestedSport,
      isWorldCup: parsedSport.isWorldCup,
      sources,
      categories,
      sentiments,
      nextCursor,
      hasMore,
      limit,
      refreshed: false,
      isStale: stale,
      lastSyncedAt: latest?.fetchedAt?.toISOString() ?? latest?.updatedAt?.toISOString() ?? null,
      message:
        items.length === 0
          ? `No cached ${parsedSport.isWorldCup ? 'World Cup' : parsedSport.sport} news is available yet.`
          : stale
            ? 'Cached news is stale. Admin/cron sync must refresh provider data.'
            : null,
    };

    setApiCached(cacheKey, body, { ttlMs: API_CACHE_TTL.SHORT });

    return NextResponse.json(body, {
      headers: cacheControlHeaders('short'),
    });
  } catch (error) {
    console.error('[News API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news', details: String(error) },
      { status: 500 }
    );
  }
})


import { withApiUsage } from "@/lib/telemetry/usage"
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeTeamAbbrev } from '@/lib/team-abbrev';
import { syncNewsToDb } from './sync-helper';
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
    const team = searchParams.get('team');
    const category = searchParams.get('category');
    const source = searchParams.get('source');
    const sentiment = searchParams.get('sentiment');
    const player = searchParams.get('player');
    const refresh = searchParams.get('refresh') === 'true';

    const { limit, cursor } = parseCursorPageParams(request, 100);

    if (!refresh) {
      const cacheKey = buildApiCacheKey('GET', request.url, { excludeParams: ['refresh', '_t'] });
      const cached = getApiCached(cacheKey);
      if (cached) {
        return NextResponse.json(cached.body, {
          status: cached.status,
          headers: { ...cached.headers, 'X-Cache': 'HIT' },
        });
      }
    }

    if (refresh) {
      await syncNewsToDb(team || undefined);
    }

    const andConditions: any[] = [];

    const where: Record<string, unknown> = {
      sport: 'NFL',
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
    let news = await prisma.sportsNews.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take,
    });

    const stale = news.length === 0 || (news.length > 0 && news[0].expiresAt < new Date());

    if (stale && !refresh) {
      await syncNewsToDb(team || undefined);
      news = await prisma.sportsNews.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take,
      });
    }

    const hasMore = news.length > take;
    const items = hasMore ? news.slice(0, limit) : news;
    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1].publishedAt)
      : null;

    const sources = [...new Set(items.map(n => n.source))];
    const categories = [...new Set(items.map(n => n.category).filter(Boolean))];
    const sentiments = [...new Set(items.map(n => n.sentiment).filter(Boolean))];

    const body = {
      news: items,
      count: items.length,
      sources,
      categories,
      sentiments,
      nextCursor,
      hasMore,
      limit,
    };

    if (!refresh) {
      const cacheKey = buildApiCacheKey('GET', request.url, { excludeParams: ['refresh', '_t'] });
      setApiCached(cacheKey, body, { ttlMs: API_CACHE_TTL.SHORT });
    }

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

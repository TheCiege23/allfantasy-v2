import { NextResponse } from 'next/server'
import { listArticles, generateArticle } from '@/lib/sports-media-engine'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { ArticleGenerationType } from '@/lib/sports-media-engine/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/media
 * Query: sport, tags (comma-separated), limit, cursor.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const url = new URL(req.url)
    const sport = url.searchParams.get('sport') ?? undefined
    const tagsParam = url.searchParams.get('tags')
    const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : undefined
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 50)
    const cursor = url.searchParams.get('cursor') ?? undefined

    const result = await listArticles({
      leagueId,
      sport: sport ? normalizeToSupportedSport(sport) : undefined,
      tags,
      limit,
      cursor,
    })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[media GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list articles' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/leagues/[leagueId]/media
 * Body: { type: ArticleGenerationType, sport?, leagueName?, season?, week?, tradeSummary?, skipStatsInsights? }
 * Generates one article and returns { articleId, headline, tags }.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const type = (body.type as ArticleGenerationType) || 'weekly_recap'
    const validTypes: ArticleGenerationType[] = [
      'weekly_recap',
      'power_rankings',
      'trade_breakdown',
      'upset_alert',
      'playoff_preview',
      'championship_recap',
    ]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const result = await generateArticle({
      leagueId,
      sport: body.sport ?? undefined,
      leagueName: body.leagueName ?? undefined,
      season: body.season ?? undefined,
      week: body.week ?? undefined,
      tradeSummary: body.tradeSummary ?? undefined,
      skipStatsInsights: !!body.skipStatsInsights,
      type,
    })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[media POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate article' },
      { status: 500 }
    )
  }
}

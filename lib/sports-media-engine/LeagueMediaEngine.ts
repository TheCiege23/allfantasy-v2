/**
 * LeagueMediaEngine — orchestrates AI-generated league news and narratives.
 * Produces: weekly recaps, power rankings, trade breakdowns, upset alerts, playoff previews, championship recaps.
 */

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { buildRecapContext } from './RecapGenerator'
import { buildPowerRankingContext } from './PowerRankingGenerator'
import { getStatisticalInsights, buildArticle } from './NarrativeBuilder'
import type { ArticleGenerationType, GenerationContext } from './types'

export interface GenerateArticleInput {
  leagueId: string
  sport?: string | null
  leagueName?: string
  season?: string
  week?: number
  type: ArticleGenerationType
  /** Optional: for trade_breakdown */
  tradeSummary?: string
  /** Skip DeepSeek stats step to speed up or when unavailable */
  skipStatsInsights?: boolean
}

export interface GenerateArticleResult {
  articleId: string
  headline: string
  tags: string[]
  error?: string
}

/**
 * Generate one article of the given type and persist it.
 */
export async function generateArticle(input: GenerateArticleInput): Promise<GenerateArticleResult> {
  const { leagueId, type, tradeSummary, skipStatsInsights } = input
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true, sport: true, leagueSize: true },
  })
  const resolvedSport = normalizeToSupportedSport(input.sport ?? league?.sport)
  const resolvedLeagueName = input.leagueName ?? league?.name ?? undefined

  let ctx: GenerationContext

  switch (type) {
    case 'weekly_recap':
      ctx = await buildRecapContext({
        leagueId,
        sport: resolvedSport,
        leagueName: resolvedLeagueName,
        season: input.season,
        week: input.week,
      })
      break
    case 'power_rankings':
      ctx = await buildPowerRankingContext({
        leagueId,
        sport: resolvedSport,
        leagueName: resolvedLeagueName,
        season: input.season,
      })
      break
    case 'trade_breakdown':
      ctx = await buildPowerRankingContext({
        leagueId,
        sport: resolvedSport,
        leagueName: resolvedLeagueName,
      })
      if (tradeSummary) ctx.tradeSummary = tradeSummary
      break
    case 'upset_alert':
    case 'playoff_preview':
    case 'championship_recap':
      ctx = await buildRecapContext({
        leagueId,
        sport: resolvedSport,
        leagueName: resolvedLeagueName,
        season: input.season,
        week: input.week,
      })
      break
    default:
      ctx = await buildRecapContext({
        leagueId,
        sport: resolvedSport,
        leagueName: resolvedLeagueName,
        season: input.season,
      })
  }

  const sport = ctx.sport
  const statisticalInsights =
    skipStatsInsights === true ? '' : await getStatisticalInsights(ctx)

  const leagueMeta = league
    ? {
        sport: league.sport,
        leagueName: league.name,
        numTeams: league.leagueSize ?? undefined,
      }
    : undefined

  const article = await buildArticle(type, ctx, {
    statisticalInsights: statisticalInsights || undefined,
    leagueMeta,
  })

  const created = await prisma.mediaArticle.create({
    data: {
      leagueId,
      sport,
      headline: article.headline,
      body: article.body,
      tags: article.tags,
    },
  })

  return {
    articleId: created.id,
    headline: created.headline,
    tags: article.tags,
  }
}

export interface ListArticlesInput {
  leagueId: string
  sport?: string | null
  tags?: string[]
  limit?: number
  cursor?: string
}

/**
 * List media articles for a league with optional filters.
 */
export async function listArticles(input: ListArticlesInput) {
  const { leagueId, sport, tags, limit = 20, cursor } = input
  const where: {
    leagueId: string
    sport?: string
    OR?: Array<{ tags: { array_contains: string[] } }>
  } = { leagueId }
  if (sport) where.sport = sport
  const requestedTags = tags?.length ? tags.filter(Boolean) : []
  const hasTagFilter = requestedTags.length > 0
  if (hasTagFilter) {
    where.OR = requestedTags.map((tag) => ({
      tags: {
        array_contains: [tag],
      },
    }))
  }

  const rows = await prisma.mediaArticle.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })

  const hasMore = rows.length > limit
  const list = hasMore ? rows.slice(0, limit) : rows

  return {
    articles: list.map((a) => ({
      id: a.id,
      leagueId: a.leagueId,
      sport: a.sport,
      headline: a.headline,
      body: a.body,
      tags: (a.tags as string[]) ?? [],
      createdAt: a.createdAt,
    })),
    nextCursor: hasMore ? list[list.length - 1]?.id : undefined,
  }
}

/**
 * Get a single article by id (and optionally leagueId for scoping).
 */
export async function getArticleById(articleId: string, leagueId?: string) {
  const article = await prisma.mediaArticle.findFirst({
    where: { id: articleId, ...(leagueId ? { leagueId } : {}) },
  })
  if (!article) return null
  return {
    id: article.id,
    leagueId: article.leagueId,
    sport: article.sport,
    headline: article.headline,
    body: article.body,
    tags: (article.tags as string[]) ?? [],
    createdAt: article.createdAt,
  }
}

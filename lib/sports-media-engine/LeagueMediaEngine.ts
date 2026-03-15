/**
 * LeagueMediaEngine — orchestrates AI-generated league news and narratives.
 * Produces: weekly recaps, power rankings, trade breakdowns, upset alerts, playoff previews, championship recaps.
 */

import { prisma } from '@/lib/prisma'
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
  let ctx: GenerationContext

  switch (type) {
    case 'weekly_recap':
      ctx = await buildRecapContext({
        leagueId,
        sport: input.sport,
        leagueName: input.leagueName,
        season: input.season,
        week: input.week,
      })
      break
    case 'power_rankings':
      ctx = await buildPowerRankingContext({
        leagueId,
        sport: input.sport,
        leagueName: input.leagueName,
        season: input.season,
      })
      break
    case 'trade_breakdown':
      ctx = await buildPowerRankingContext({
        leagueId,
        sport: input.sport,
        leagueName: input.leagueName,
      })
      if (tradeSummary) ctx.tradeSummary = tradeSummary
      break
    case 'upset_alert':
    case 'playoff_preview':
    case 'championship_recap':
      ctx = await buildRecapContext({
        leagueId,
        sport: input.sport,
        leagueName: input.leagueName,
        season: input.season,
        week: input.week,
      })
      break
    default:
      ctx = await buildRecapContext({
        leagueId,
        sport: input.sport,
        leagueName: input.leagueName,
        season: input.season,
      })
  }

  const sport = ctx.sport
  const statisticalInsights =
    skipStatsInsights === true ? '' : await getStatisticalInsights(ctx)

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true, sport: true, leagueSize: true },
  })
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
  const where: { leagueId: string; sport?: string } = { leagueId }
  if (sport) where.sport = sport
  if (tags?.length) {
    // Filter: article tags array contains at least one of the requested tags
    const articles = await prisma.mediaArticle.findMany({
      where: { leagueId, ...(sport ? { sport } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit * 3,
    })
    const filtered = tags.length
      ? articles.filter((a) => {
          const t = (a.tags as string[]) ?? []
          return tags.some((tag) => t.includes(tag))
        })
      : articles
    const limited = filtered.slice(0, limit)
    return {
      articles: limited.map((a) => ({
        id: a.id,
        leagueId: a.leagueId,
        sport: a.sport,
        headline: a.headline,
        body: a.body,
        tags: (a.tags as string[]) ?? [],
        createdAt: a.createdAt,
      })),
      nextCursor: limited.length === filtered.length ? undefined : limited[limited.length - 1]?.id,
    }
  }

  const articles = await prisma.mediaArticle.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })
  const hasMore = articles.length > limit
  const list = hasMore ? articles.slice(0, limit) : articles
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

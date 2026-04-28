import 'server-only'

import { createHash } from 'crypto'

import { prisma } from '@/lib/prisma'
import type { SupportedSport } from '@/lib/sport-scope'

const HOUR_MS = 60 * 60 * 1000

export const NEWSAPI_PLAYER_TEAM_TTL_MS = 2 * HOUR_MS
export const NEWSAPI_INJURY_TTL_MS = 1 * HOUR_MS
export const NEWSAPI_QUERY_TTL_MS = 2 * HOUR_MS
export const NEWSAPI_STALE_FALLBACK_MS = 24 * HOUR_MS

const DEFAULT_DOMAINS = [
  'espn.com', 'bleacherreport.com', 'nfl.com', 'cbssports.com', 'foxsports.com',
  'theathletic.com', 'si.com', 'profootballtalk.nbcsports.com', 'yahoo.com',
  'rotoworld.com', 'fantasypros.com', 'rotowire.com', 'footballoutsiders.com',
  'pff.com', 'nfltraderumors.co', 'sportingnews.com',
].join(',')

const DEFAULT_EXCLUDE_DOMAINS = [
  'reddit.com', 'twitter.com', 'facebook.com', 'tiktok.com',
].join(',')

const INJURY_RE = /(ruled out|placed on|inactive|suspended|injured list|\bIR\b|\bIL\b|scratches|scratch|out for|DNP)/i
const STOP_WORDS = new Set(['and', 'the', 'for', 'with', 'from', 'that', 'this', 'into', 'fantasy', 'news', 'update', 'latest'])

export type NewsApiCacheMeta = {
  cacheKey: string
  cacheHit: boolean
  degraded: boolean
  stale: boolean
  source: 'sports-news' | 'sports-data-cache' | 'newsapi-live'
}

export type NewsApiCacheArticle = {
  id: string
  sport: SupportedSport
  title: string
  description: string | null
  content: string | null
  url: string
  published: string
  team: string | null
  teams: string[]
  source: string
  sourceId: string | null
  author: string | null
  imageUrl: string | null
  playerNames: string[]
  categories: string[]
  sentiment: string | null
}

type NewsApiLiveArticle = {
  title?: string
  description?: string | null
  content?: string | null
  url?: string
  publishedAt?: string
  author?: string | null
  urlToImage?: string | null
  source?: { id?: string | null; name?: string | null }
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function dayBucket(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00.000Z`) : value
  return date.toISOString().slice(0, 10)
}

function nowIso(): string {
  return new Date().toISOString()
}

function hashId(prefix: string, value: string): string {
  return createHash('sha256').update(`${prefix}:${value}`).digest('hex').slice(0, 40)
}

function scoreTextMatch(text: string, terms: string[]): number {
  const lower = text.toLowerCase()
  return terms.reduce((score, term) => (lower.includes(term) ? score + Math.max(1, term.length - 2) : score), 0)
}

function extractTerms(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !STOP_WORDS.has(term)),
    ),
  )
}

function logNewsApi(message: string, details: Record<string, unknown>): void {
  console.info(`[newsapi] ${message}`, details)
}

function warnNewsApi(message: string, details: Record<string, unknown>): void {
  console.warn(`[newsapi] ${message}`, details)
}

function buildMeta(cacheKey: string, source: NewsApiCacheMeta['source'], options?: Partial<Omit<NewsApiCacheMeta, 'cacheKey' | 'source'>>): NewsApiCacheMeta {
  return {
    cacheKey,
    source,
    cacheHit: options?.cacheHit ?? false,
    degraded: options?.degraded ?? false,
    stale: options?.stale ?? false,
  }
}

function parseTeams(text: string): string[] {
  const matches = text.match(/\b(ARI|ATL|BAL|BUF|CAR|CHI|CIN|CLE|DAL|DEN|DET|GB|HOU|IND|JAX|KC|LV|LAC|LAR|MIA|MIN|NE|NO|NYG|NYJ|PHI|PIT|SF|SEA|TB|TEN|WAS)\b/gi) ?? []
  return Array.from(new Set(matches.map((team) => team.toUpperCase())))
}

function parsePlayerNames(text: string): string[] {
  const matches = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){1,3})\b/g) ?? []
  return Array.from(new Set(matches.map((name) => name.trim()))).slice(0, 6)
}

function mapSportsNewsRows(rows: Array<{
  externalId: string
  sport: string
  title: string
  description: string | null
  content: string | null
  source: string
  sourceUrl: string | null
  playerName: string | null
  playerNames: string[]
  team: string | null
  teams: string[]
  author: string | null
  imageUrl: string | null
  sourceId: string | null
  category: string | null
  sentiment: string | null
  publishedAt: Date | null
}>): NewsApiCacheArticle[] {
  return rows.map((row) => ({
    id: row.externalId,
    sport: row.sport as SupportedSport,
    title: row.title,
    description: row.description,
    content: row.content,
    url: row.sourceUrl ?? '',
    published: row.publishedAt?.toISOString() ?? nowIso(),
    team: row.team,
    teams: row.teams ?? [],
    source: row.source,
    sourceId: row.sourceId,
    author: row.author,
    imageUrl: row.imageUrl,
    playerNames: row.playerNames?.length ? row.playerNames : row.playerName ? [row.playerName] : [],
    categories: row.category ? row.category.split(',').map((value) => value.trim()).filter(Boolean) : [],
    sentiment: row.sentiment,
  }))
}

async function findSportsNewsMatches(args: {
  sport: SupportedSport
  query: string
  limit: number
  requireInjury?: boolean
  since?: Date
}): Promise<NewsApiCacheArticle[]> {
  const rows = await prisma.sportsNews.findMany({
    where: {
      sport: args.sport,
      source: { in: ['newsapi_everything', 'newsapi_headlines'] },
      ...(args.since ? { publishedAt: { gte: args.since } } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    take: 120,
    select: {
      externalId: true,
      sport: true,
      title: true,
      description: true,
      content: true,
      source: true,
      sourceUrl: true,
      playerName: true,
      playerNames: true,
      team: true,
      teams: true,
      author: true,
      imageUrl: true,
      sourceId: true,
      category: true,
      sentiment: true,
      publishedAt: true,
    },
  })

  const terms = extractTerms(args.query)
  const ranked = rows
    .map((row) => {
      const text = `${row.title} ${row.description ?? ''} ${row.content ?? ''}`
      if (args.requireInjury && !INJURY_RE.test(text)) return null
      const score = terms.length > 0 ? scoreTextMatch(text, terms) : 1
      if (terms.length > 0 && score === 0) return null
      return { row, score }
    })
    .filter((row): row is { row: (typeof rows)[number]; score: number } => Boolean(row))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      const rightDate = right.row.publishedAt?.getTime() ?? 0
      const leftDate = left.row.publishedAt?.getTime() ?? 0
      return rightDate - leftDate
    })
    .slice(0, args.limit)
    .map((item) => item.row)

  return mapSportsNewsRows(ranked)
}

async function readSportsDataCache(cacheKey: string): Promise<{ expiresAt: Date; createdAt: Date; data: unknown } | null> {
  return prisma.sportsDataCache.findUnique({
    where: { cacheKey },
    select: { expiresAt: true, createdAt: true, data: true },
  })
}

async function saveSportsDataCache(cacheKey: string, data: NewsApiCacheArticle[], ttlMs: number): Promise<void> {
  await prisma.sportsDataCache.upsert({
    where: { cacheKey },
    update: {
      data: data as unknown as object,
      expiresAt: new Date(Date.now() + ttlMs),
    },
    create: {
      cacheKey,
      data: data as unknown as object,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  })
}

function mapLiveArticles(articles: NewsApiLiveArticle[], sport: SupportedSport, sourceTag: string): NewsApiCacheArticle[] {
  const mapped: NewsApiCacheArticle[] = []

  for (const article of articles) {
    const title = String(article.title ?? '').trim()
    if (!title || title === '[Removed]') continue

    const description = article.description ? String(article.description) : null
    const content = article.content ? String(article.content) : null
    const url = String(article.url ?? '')
    const published = String(article.publishedAt ?? nowIso())
    const combined = `${title} ${description ?? ''} ${content ?? ''}`
    const teams = parseTeams(combined)

    mapped.push({
      id: hashId(sourceTag, url || `${title}-${published}`),
      sport,
      title,
      description,
      content,
      url,
      published,
      team: teams[0] ?? null,
      teams,
      source: sourceTag,
      sourceId: article.source?.id ?? null,
      author: article.author ?? null,
      imageUrl: article.urlToImage ?? null,
      playerNames: parsePlayerNames(combined),
      categories: [String(article.source?.name ?? 'NewsAPI')],
      sentiment: null,
    })
  }

  return mapped
}

async function fetchNewsApiEverythingLive(args: {
  query: string
  sport: SupportedSport
  from?: string
  sortBy?: string
  pageSize?: number
  domains?: string
  excludeDomains?: string
}): Promise<NewsApiCacheArticle[]> {
  const apiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY
  if (!apiKey) return []

  const params = new URLSearchParams({
    q: args.query,
    language: 'en',
    sortBy: args.sortBy ?? 'publishedAt',
    from: args.from ?? new Date(Date.now() - 7 * 24 * HOUR_MS).toISOString().slice(0, 10),
    pageSize: String(args.pageSize ?? 25),
    apiKey,
  })

  if (args.domains) params.set('domains', args.domains)
  if (args.excludeDomains) params.set('excludeDomains', args.excludeDomains)

  const response = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`, {
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`NewsAPI everything ${response.status}`)
  }

  const data = (await response.json()) as { articles?: NewsApiLiveArticle[] }
  return mapLiveArticles(data.articles ?? [], args.sport, 'newsapi_everything')
}

async function fetchNewsApiTopHeadlinesLive(args: {
  sport: SupportedSport
  category?: string
  country?: string
  query?: string
  pageSize?: number
}): Promise<NewsApiCacheArticle[]> {
  const apiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY
  if (!apiKey) return []

  const params = new URLSearchParams({
    country: args.country ?? 'us',
    category: args.category ?? 'sports',
    pageSize: String(args.pageSize ?? 25),
    apiKey,
  })
  if (args.query) params.set('q', args.query)

  const response = await fetch(`https://newsapi.org/v2/top-headlines?${params.toString()}`, {
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`NewsAPI top-headlines ${response.status}`)
  }

  const data = (await response.json()) as { articles?: NewsApiLiveArticle[] }
  return mapLiveArticles(data.articles ?? [], args.sport, 'newsapi_headlines')
}

async function getCachedNewsApiArticles(args: {
  cacheKey: string
  ttlMs: number
  staleMaxAgeMs?: number
  sport: SupportedSport
  query: string
  limit: number
  requireInjury?: boolean
  since?: Date
  fetchLive: () => Promise<NewsApiCacheArticle[]>
}): Promise<{ articles: NewsApiCacheArticle[]; meta: NewsApiCacheMeta }> {
  const dbRows = await findSportsNewsMatches({
    sport: args.sport,
    query: args.query,
    limit: args.limit,
    requireInjury: args.requireInjury,
    since: args.since,
  })
  if (dbRows.length > 0) {
    logNewsApi('NewsAPI cache hit', { cacheKey: args.cacheKey, source: 'sports-news' })
    return {
      articles: dbRows,
      meta: buildMeta(args.cacheKey, 'sports-news', { cacheHit: true }),
    }
  }

  const cached = await readSportsDataCache(args.cacheKey)
  const now = Date.now()
  const fresh = cached && cached.expiresAt.getTime() > now
  const staleAllowed = cached && now - cached.createdAt.getTime() <= (args.staleMaxAgeMs ?? NEWSAPI_STALE_FALLBACK_MS)

  if (fresh) {
    logNewsApi('NewsAPI cache hit', { cacheKey: args.cacheKey, source: 'sports-data-cache' })
    return {
      articles: Array.isArray(cached.data) ? (cached.data as NewsApiCacheArticle[]) : [],
      meta: buildMeta(args.cacheKey, 'sports-data-cache', { cacheHit: true }),
    }
  }

  logNewsApi('NewsAPI cache miss', { cacheKey: args.cacheKey })

  try {
    const startedAt = Date.now()
    const articles = await args.fetchLive()
    logNewsApi(`live refresh durationMs=${Date.now() - startedAt}`, { cacheKey: args.cacheKey })
    await saveSportsDataCache(args.cacheKey, articles, args.ttlMs)
    logNewsApi('cache save', { cacheKey: args.cacheKey })
    return {
      articles,
      meta: buildMeta(args.cacheKey, 'newsapi-live'),
    }
  } catch (error) {
    if (staleAllowed) {
      warnNewsApi('stale fallback', { cacheKey: args.cacheKey })
      return {
        articles: Array.isArray(cached?.data) ? (cached.data as NewsApiCacheArticle[]) : [],
        meta: buildMeta(args.cacheKey, 'sports-data-cache', { cacheHit: true, degraded: true, stale: true }),
      }
    }
    throw error
  }
}

export function buildNewsApiQueryCacheKey(query: string, date: string | Date): string {
  return `newsapi:query:${normalizeQuery(query)}:${dayBucket(date)}`
}

export function buildNewsApiInjuryCacheKey(scope: string, date: string | Date): string {
  return `newsapi:injury:${normalizeQuery(scope)}:${dayBucket(date)}`
}

export function buildNewsApiPlayerCacheKey(playerId: string, date: string | Date): string {
  return `newsapi:player:${normalizeQuery(playerId)}:${dayBucket(date)}`
}

export function buildNewsApiTeamCacheKey(teamId: string, date: string | Date): string {
  return `newsapi:team:${normalizeQuery(teamId)}:${dayBucket(date)}`
}

export async function getNewsApiEverythingDbFirst(args: {
  query: string
  sport: SupportedSport
  pageSize?: number
  domains?: string
  excludeDomains?: string
  sortBy?: string
  from?: string
  referenceDate?: string | Date
  ttlMs?: number
}): Promise<{ articles: NewsApiCacheArticle[]; meta: NewsApiCacheMeta }> {
  const referenceDate = args.referenceDate ?? new Date()
  return getCachedNewsApiArticles({
    cacheKey: buildNewsApiQueryCacheKey(args.query, referenceDate),
    ttlMs: args.ttlMs ?? NEWSAPI_QUERY_TTL_MS,
    sport: args.sport,
    query: args.query,
    limit: args.pageSize ?? 12,
    fetchLive: () =>
      fetchNewsApiEverythingLive({
        query: args.query,
        sport: args.sport,
        domains: args.domains ?? DEFAULT_DOMAINS,
        excludeDomains: args.excludeDomains ?? DEFAULT_EXCLUDE_DOMAINS,
        sortBy: args.sortBy,
        from: args.from,
        pageSize: args.pageSize,
      }),
  })
}

export async function getNewsApiTopHeadlinesDbFirst(args: {
  sport: SupportedSport
  query?: string
  category?: string
  country?: string
  pageSize?: number
  referenceDate?: string | Date
  ttlMs?: number
}): Promise<{ articles: NewsApiCacheArticle[]; meta: NewsApiCacheMeta }> {
  const query = args.query ?? 'sports headlines'
  const referenceDate = args.referenceDate ?? new Date()
  return getCachedNewsApiArticles({
    cacheKey: buildNewsApiQueryCacheKey(query, referenceDate),
    ttlMs: args.ttlMs ?? NEWSAPI_QUERY_TTL_MS,
    sport: args.sport,
    query,
    limit: args.pageSize ?? 12,
    fetchLive: () =>
      fetchNewsApiTopHeadlinesLive({
        sport: args.sport,
        query: args.query,
        category: args.category,
        country: args.country,
        pageSize: args.pageSize,
      }),
  })
}

export async function getInjuryNewsArticlesDbFirst(args: {
  sport: SupportedSport
  gameDate: string
}): Promise<{ articles: NewsApiCacheArticle[]; meta: NewsApiCacheMeta }> {
  const query = args.sport === 'NFL'
    ? '(ruled out OR inactive OR IR OR injured reserve) NFL'
    : args.sport === 'NBA'
      ? '(out OR DNP OR inactive OR suspended) NBA'
      : args.sport === 'MLB'
        ? '(injured list OR IL OR suspended) MLB'
        : args.sport === 'NHL'
          ? '(IR OR LTIR OR suspended) NHL'
          : args.sport === 'NCAAF'
            ? '(out OR suspended) college football'
            : args.sport === 'NCAAB'
              ? '(out OR suspended) college basketball'
              : args.sport === 'SOCCER'
                ? '(suspended OR injured OR out) soccer'
                : `${args.sport} injury ruled out`

  return getCachedNewsApiArticles({
    cacheKey: buildNewsApiInjuryCacheKey(args.sport, args.gameDate),
    ttlMs: NEWSAPI_INJURY_TTL_MS,
    sport: args.sport,
    query,
    limit: 40,
    requireInjury: true,
    since: new Date(`${args.gameDate}T00:00:00.000Z`),
    fetchLive: () =>
      fetchNewsApiEverythingLive({
        query,
        sport: args.sport,
        from: args.gameDate,
        pageSize: 40,
        sortBy: 'publishedAt',
        domains: 'bleacherreport.com,espn.com,cbssports.com,nfl.com,nba.com,mlb.com,nhl.com',
      }),
  })
}
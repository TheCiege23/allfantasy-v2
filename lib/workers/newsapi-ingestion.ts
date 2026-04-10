/**
 * NewsAPI Ingestion Engine
 *
 * Fetches sports news from NewsAPI.org and persists to DB.
 * Same notification pipeline as X API ingestion.
 *
 * Covers: NFL, NBA, MLB, NHL, College Football, College Basketball, Soccer
 * Categories: injuries, trades, signings, suspensions, team news, game updates
 */

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

const NEWSAPI_BASE = 'https://newsapi.org/v2'

type NewsAPIArticle = {
  title: string
  description: string | null
  url: string
  source: { name: string }
  publishedAt: string
  content: string | null
}

// Sport-specific search queries for NewsAPI
const SPORT_QUERIES: Record<string, string[]> = {
  nfl: ['NFL injury', 'NFL trade', 'NFL signing', 'NFL suspension', 'NFL roster'],
  nba: ['NBA injury', 'NBA trade', 'NBA signing', 'NBA suspension'],
  mlb: ['MLB injury', 'MLB trade', 'MLB signing', 'MLB roster'],
  nhl: ['NHL injury', 'NHL trade', 'NHL signing', 'NHL suspension'],
  ncaaf: ['college football injury', 'college football transfer portal'],
  ncaab: ['college basketball injury', 'college basketball transfer portal'],
  soccer: ['Premier League injury', 'La Liga transfer', 'soccer injury'],
}

// Impact keywords
const HIGH_IMPACT = ['ruled out', 'out for season', 'ACL', 'torn', 'traded', 'suspended', 'surgery', 'fracture', 'placed on IR']
const MEDIUM_IMPACT = ['questionable', 'doubtful', 'day-to-day', 'signed', 'extension', 'limited']

/**
 * Fetch sports news from NewsAPI and persist to DB.
 */
export async function runNewsAPIIngestion(sports?: string[]): Promise<{
  fetched: number
  newRecords: number
  duplicatesSkipped: number
  errors: string[]
}> {
  const apiKey = process.env.NEWSAPI_KEY ?? process.env.NEWS_API_KEY
  if (!apiKey) {
    return { fetched: 0, newRecords: 0, duplicatesSkipped: 0, errors: ['NEWSAPI_KEY not configured'] }
  }

  const targetSports = sports ?? Object.keys(SPORT_QUERIES)
  let fetched = 0
  let newRecords = 0
  let duplicatesSkipped = 0
  const errors: string[] = []

  for (const sport of targetSports) {
    const queries = SPORT_QUERIES[sport]
    if (!queries) continue

    for (const query of queries) {
      try {
        const articles = await fetchNewsAPI(apiKey, query)
        fetched += articles.length

        for (const article of articles) {
          const result = await persistArticle(article, sport)
          if (result === 'new') newRecords++
          else if (result === 'duplicate') duplicatesSkipped++
        }
      } catch (e) {
        errors.push(`${sport}/${query}: ${e instanceof Error ? e.message : String(e)}`)
      }

      // Rate limit: NewsAPI free tier = 100 requests/day
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  return { fetched, newRecords, duplicatesSkipped, errors }
}

async function fetchNewsAPI(apiKey: string, query: string): Promise<NewsAPIArticle[]> {
  const url = new URL(`${NEWSAPI_BASE}/everything`)
  url.searchParams.set('q', query)
  url.searchParams.set('language', 'en')
  url.searchParams.set('sortBy', 'publishedAt')
  url.searchParams.set('pageSize', '10')
  url.searchParams.set('apiKey', apiKey)

  // Only fetch last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  url.searchParams.set('from', yesterday.toISOString())

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`NewsAPI ${res.status}: ${await res.text().catch(() => 'unknown')}`)
  }

  const data = await res.json() as { articles?: NewsAPIArticle[] }
  return data.articles ?? []
}

async function persistArticle(
  article: NewsAPIArticle,
  sport: string,
): Promise<'new' | 'duplicate' | 'error'> {
  if (!article.title?.trim()) return 'error'

  const normalizedSport = normalizeToSupportedSport(sport)
  const headline = article.title.trim()
  const body = article.description ?? article.content ?? ''
  const lower = (headline + ' ' + body).toLowerCase()

  // Extract player name (simple heuristic — look for capitalized two-word names)
  const nameMatch = headline.match(/([A-Z][a-z]+ [A-Z][a-z]+)/)
  const playerName = nameMatch ? nameMatch[1] : null

  // Classify impact
  let impact: 'high' | 'medium' | 'low' = 'low'
  if (HIGH_IMPACT.some((kw) => lower.includes(kw))) impact = 'high'
  else if (MEDIUM_IMPACT.some((kw) => lower.includes(kw))) impact = 'medium'

  // Check for duplicate
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
  const existing = await prisma.playerNewsRecord.findFirst({
    where: {
      sport: normalizedSport,
      headline,
      publishedAt: { gte: fourHoursAgo },
    },
  }).catch(() => null)

  if (existing) return 'duplicate'

  await prisma.playerNewsRecord.create({
    data: {
      sport: normalizedSport,
      playerId: null,
      playerName,
      team: null,
      headline,
      body: body.slice(0, 2000),
      impact,
      fantasyRelevant: impact !== 'low',
      source: `newsapi:${article.source?.name ?? 'unknown'}`,
      publishedAt: new Date(article.publishedAt),
    },
  }).catch(() => {})

  return 'new'
}

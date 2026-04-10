/**
 * X (Twitter) API News Ingestion Engine
 *
 * Fetches real-time player news from X/Twitter via the Grok search API.
 * Categories: injuries, suspensions, trades, signings, team news, player news.
 * Results are persisted to PlayerNewsRecord and InjuryReportRecord tables.
 * Cached until new updates arrive for each player.
 *
 * Flow:
 * 1. Cron runs every 5-15 minutes (configurable)
 * 2. Searches X for sport-specific keywords
 * 3. Deduplicates against existing records
 * 4. Classifies by category (injury, trade, signing, suspension, etc.)
 * 5. Persists to DB
 * 6. Triggers notifications for affected rostered players
 */

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type NewsCategory =
  | 'injury'
  | 'suspension'
  | 'trade'
  | 'signing'
  | 'release'
  | 'roster_move'
  | 'team_news'
  | 'player_news'
  | 'game_update'
  | 'coaching'

export type XNewsItem = {
  headline: string
  body: string
  playerName: string | null
  team: string | null
  sport: string
  category: NewsCategory
  impact: 'high' | 'medium' | 'low'
  source: string
  sourceUrl: string | null
  publishedAt: Date
}

// Sport-specific search queries for X API
const SPORT_SEARCH_QUERIES: Record<string, string[]> = {
  nfl: [
    '(injury OR injured OR ruled out OR questionable OR doubtful OR IR OR concussion) (NFL) -fantasy -DFS -bet',
    '(traded OR trade OR signs OR signed OR released OR waived OR cut) (NFL) -fantasy -mock',
    '(suspended OR suspension) (NFL)',
    '(placed on IR OR injured reserve OR out for season) (NFL)',
  ],
  nba: [
    '(injury OR injured OR out tonight OR GTD OR game-time decision OR ruled out) (NBA)',
    '(traded OR trade OR signs OR signed OR released OR waived) (NBA)',
    '(suspended OR suspension) (NBA)',
    '(load management OR rest OR sitting out) (NBA)',
  ],
  mlb: [
    '(injured list OR IL OR day-to-day OR TJS OR Tommy John) (MLB)',
    '(traded OR trade OR signs OR signed OR DFA OR designated for assignment) (MLB)',
    '(suspended OR suspension) (MLB)',
  ],
  nhl: [
    '(injury OR injured OR day-to-day OR LTIR OR IR) (NHL)',
    '(traded OR trade OR signs OR signed OR waived) (NHL)',
    '(suspended OR suspension) (NHL)',
  ],
  ncaaf: [
    '(injury OR injured OR out for season OR transfer portal) (college football OR CFB)',
    '(transfer portal OR commits OR decommits) (college football)',
  ],
  ncaab: [
    '(injury OR injured OR out OR transfer portal) (college basketball OR CBB)',
    '(transfer portal OR commits) (college basketball)',
  ],
  soccer: [
    '(injury OR injured OR ruled out OR doubtful) (Premier League OR La Liga OR Serie A OR Bundesliga)',
    '(transfer OR signs OR signed OR loan) (Premier League OR La Liga)',
  ],
}

// Keywords for category classification
const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  injury: ['injury', 'injured', 'ruled out', 'questionable', 'doubtful', 'concussion', 'IL', 'IR', 'day-to-day', 'out for', 'DNP', 'limited', 'hamstring', 'knee', 'ankle', 'shoulder', 'back'],
  suspension: ['suspended', 'suspension', 'banned', 'PED', 'conduct'],
  trade: ['traded', 'trade', 'acquired', 'deal', 'blockbuster', 'swap'],
  signing: ['signs', 'signed', 'contract', 'extension', 'deal', 'agrees'],
  release: ['released', 'waived', 'cut', 'DFA', 'designated for assignment'],
  roster_move: ['placed on IR', 'injured reserve', 'activated', 'recalled', 'promoted', 'demoted', 'roster move'],
  team_news: ['coaching', 'hire', 'fired', 'front office', 'ownership', 'relocat'],
  player_news: ['return', 'comeback', 'retirement', 'retire'],
  game_update: ['postponed', 'cancelled', 'delayed', 'weather'],
  coaching: ['head coach', 'coaching change', 'coordinator', 'fired', 'hired'],
}

// Impact classification
const HIGH_IMPACT_KEYWORDS = ['ruled out', 'out for season', 'traded', 'suspended', 'released', 'placed on IR', 'ACL', 'torn', 'fracture', 'surgery', 'TJS']
const MEDIUM_IMPACT_KEYWORDS = ['questionable', 'doubtful', 'day-to-day', 'signed', 'extension', 'limited', 'DNP']

/**
 * Run the X API news ingestion for all sports.
 * Called by cron every 5-15 minutes.
 */
export async function runXNewsIngestion(sports?: string[]): Promise<{
  fetched: number
  newRecords: number
  duplicatesSkipped: number
  injuryRecords: number
  errors: string[]
}> {
  const targetSports = sports ?? Object.keys(SPORT_SEARCH_QUERIES)
  let fetched = 0
  let newRecords = 0
  let duplicatesSkipped = 0
  let injuryRecords = 0
  const errors: string[] = []

  for (const sport of targetSports) {
    const queries = SPORT_SEARCH_QUERIES[sport]
    if (!queries) continue

    for (const query of queries) {
      try {
        const items = await searchXForNews(query, sport)
        fetched += items.length

        for (const item of items) {
          const persisted = await persistNewsItem(item)
          if (persisted === 'new') {
            newRecords++
            // If it's an injury, also create/update injury record
            if (item.category === 'injury' && item.playerName) {
              await persistInjuryFromNews(item)
              injuryRecords++
            }
          } else if (persisted === 'duplicate') {
            duplicatesSkipped++
          }
        }
      } catch (e) {
        errors.push(`${sport}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return { fetched, newRecords, duplicatesSkipped, injuryRecords, errors }
}

/**
 * Search X/Twitter for news using Grok's search capabilities.
 */
async function searchXForNews(query: string, sport: string): Promise<XNewsItem[]> {
  try {
    const { xaiResponsesJson } = await import('@/lib/xai-client')

    const result = await xaiResponsesJson({
      model: 'grok-3-mini',
      input: `Search X/Twitter for the latest fantasy sports news. Extract player names, teams, and categorize each result.\n\nSearch query: ${query}\n\nFor each result, return JSON array with objects containing: headline, playerName, team, category (injury/trade/signing/suspension/release/roster_move), impact (high/medium/low), body (brief summary).`,
      tools: [{ type: 'web_search' as const }],
    })

    if (!result?.output) return []

    // Parse the AI response for structured news items
    const parsed = parseXNewsResponse(result.output, sport)
    return parsed
  } catch (e) {
    console.warn(`[x-news] Search failed for ${sport}:`, e instanceof Error ? e.message : String(e))
    return []
  }
}

/**
 * Parse Grok's response into structured news items.
 */
function parseXNewsResponse(output: unknown, sport: string): XNewsItem[] {
  const items: XNewsItem[] = []

  // Extract text from response
  let text = ''
  if (typeof output === 'string') {
    text = output
  } else if (Array.isArray(output)) {
    text = output.map((o) => {
      if (typeof o === 'string') return o
      if (typeof o === 'object' && o !== null && 'text' in o) return String((o as { text: unknown }).text)
      return JSON.stringify(o)
    }).join('\n')
  } else if (typeof output === 'object' && output !== null) {
    text = JSON.stringify(output)
  }

  // Try to extract JSON array from response
  const jsonMatch = text.match(/\[[\s\S]*?\]/g)
  if (jsonMatch) {
    for (const match of jsonMatch) {
      try {
        const arr = JSON.parse(match) as Array<Record<string, unknown>>
        for (const obj of arr) {
          if (!obj.headline && !obj.playerName) continue
          items.push({
            headline: String(obj.headline ?? obj.title ?? ''),
            body: String(obj.body ?? obj.summary ?? obj.description ?? ''),
            playerName: obj.playerName ? String(obj.playerName) : null,
            team: obj.team ? String(obj.team) : null,
            sport: normalizeToSupportedSport(sport),
            category: classifyCategory(String(obj.headline ?? '') + ' ' + String(obj.body ?? '')),
            impact: classifyImpact(String(obj.headline ?? '') + ' ' + String(obj.body ?? '')),
            source: 'x_grok_search',
            sourceUrl: obj.url ? String(obj.url) : null,
            publishedAt: new Date(),
          })
        }
      } catch { /* not valid JSON array, skip */ }
    }
  }

  // If no JSON found, try to extract from plain text
  if (items.length === 0 && text.length > 20) {
    const lines = text.split('\n').filter((l) => l.trim().length > 10)
    for (const line of lines.slice(0, 10)) {
      const playerMatch = line.match(/([A-Z][a-z]+ [A-Z][a-z]+)/)
      if (playerMatch) {
        items.push({
          headline: line.trim().slice(0, 200),
          body: line.trim(),
          playerName: playerMatch[1],
          team: null,
          sport: normalizeToSupportedSport(sport),
          category: classifyCategory(line),
          impact: classifyImpact(line),
          source: 'x_grok_search',
          sourceUrl: null,
          publishedAt: new Date(),
        })
      }
    }
  }

  return items.slice(0, 20) // Max 20 items per query
}

function classifyCategory(text: string): NewsCategory {
  const lower = text.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category as NewsCategory
    }
  }
  return 'player_news'
}

function classifyImpact(text: string): 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase()
  if (HIGH_IMPACT_KEYWORDS.some((kw) => lower.includes(kw))) return 'high'
  if (MEDIUM_IMPACT_KEYWORDS.some((kw) => lower.includes(kw))) return 'medium'
  return 'low'
}

/**
 * Persist a news item to the database, deduplicating by headline + player + time.
 */
async function persistNewsItem(item: XNewsItem): Promise<'new' | 'duplicate' | 'error'> {
  if (!item.headline.trim()) return 'error'

  // Check for recent duplicate (same player + similar headline in last 4 hours)
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
  const existing = await prisma.playerNewsRecord.findFirst({
    where: {
      sport: item.sport,
      playerName: item.playerName ?? undefined,
      headline: item.headline,
      publishedAt: { gte: fourHoursAgo },
    },
  }).catch(() => null)

  if (existing) return 'duplicate'

  await prisma.playerNewsRecord.create({
    data: {
      sport: item.sport,
      playerId: null,
      playerName: item.playerName,
      team: item.team,
      headline: item.headline,
      body: item.body.slice(0, 2000),
      impact: item.impact,
      fantasyRelevant: true,
      source: item.source,
      publishedAt: item.publishedAt,
    },
  }).catch((e) => {
    console.warn('[x-news] Insert failed (likely duplicate):', e instanceof Error ? e.message : '')
  })

  return 'new'
}

/**
 * Create/update an injury record from a news item.
 */
async function persistInjuryFromNews(item: XNewsItem): Promise<void> {
  if (!item.playerName) return

  const lower = item.headline.toLowerCase() + ' ' + item.body.toLowerCase()

  // Determine injury status
  let status = 'Unknown'
  if (lower.includes('ruled out') || lower.includes('out for')) status = 'Out'
  else if (lower.includes('doubtful')) status = 'Doubtful'
  else if (lower.includes('questionable')) status = 'Questionable'
  else if (lower.includes('day-to-day')) status = 'Day-to-Day'
  else if (lower.includes('placed on ir') || lower.includes('injured reserve')) status = 'IR'
  else if (lower.includes('concussion')) status = 'Concussion Protocol'
  else if (lower.includes('limited')) status = 'Limited'

  // Determine body part
  let bodyPart = 'Undisclosed'
  const bodyParts = ['hamstring', 'knee', 'ankle', 'shoulder', 'back', 'groin', 'calf', 'hip', 'wrist', 'elbow', 'foot', 'neck', 'ribs', 'quad', 'achilles', 'thumb', 'finger', 'toe', 'hand', 'arm', 'leg']
  for (const part of bodyParts) {
    if (lower.includes(part)) { bodyPart = part.charAt(0).toUpperCase() + part.slice(1); break }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.injuryReportRecord.upsert({
    where: {
      sport_playerId_reportDate_status: {
        sport: item.sport,
        playerId: item.playerName, // Use name as ID fallback
        reportDate: today,
        status,
      },
    },
    create: {
      sport: item.sport,
      playerId: item.playerName,
      playerName: item.playerName,
      team: item.team,
      status,
      bodyPart,
      notes: item.headline,
      reportDate: today,
    },
    update: {
      status,
      bodyPart,
      notes: item.headline,
      team: item.team,
    },
  }).catch(() => {})
}

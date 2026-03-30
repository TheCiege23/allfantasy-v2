/**
 * Sport Rules API — returns valid roster slots, scoring, player pool, and draft options for a sport.
 * GET ?sport=NFL&format=PPR
 * Used by league creation and settings to adapt UI by sport.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getRulesForSport, isSportSupported } from '@/lib/sport-rules-engine'

const LEAGUE_SPORT_VALUES = ['NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER'] as const
const SPORT_RULES_CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=900'
const SPORT_RULES_SERVER_TIMING_METRIC = 'sport_rules'

function buildTimedHeaders(cacheControl: string, startedAtMs: number): HeadersInit {
  const durationMs = Math.max(0, Date.now() - startedAtMs)
  return {
    'Cache-Control': cacheControl,
    'Server-Timing': `${SPORT_RULES_SERVER_TIMING_METRIC};dur=${durationMs}`,
  }
}

function normalizeSport(s: string): (typeof LEAGUE_SPORT_VALUES)[number] {
  const u = (s || 'NFL').trim().toUpperCase()
  if (LEAGUE_SPORT_VALUES.includes(u as any)) return u as (typeof LEAGUE_SPORT_VALUES)[number]
  return 'NFL'
}

export async function GET(request: NextRequest) {
  const startedAtMs = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const sportParam = searchParams.get('sport') ?? 'NFL'
    const formatParam = searchParams.get('format') ?? searchParams.get('variant') ?? null

    if (!isSportSupported(sportParam)) {
      return NextResponse.json(
        { error: 'Unsupported sport', validSports: LEAGUE_SPORT_VALUES },
        { status: 400 }
      )
    }

    const sport = normalizeSport(sportParam)
    const format = formatParam?.trim() || null
    const rules = getRulesForSport(sport, format)
    return NextResponse.json(rules, {
      headers: buildTimedHeaders(SPORT_RULES_CACHE_CONTROL, startedAtMs),
    })
  } catch (e) {
    console.error('[sport-rules] Error:', e)
    return NextResponse.json({ error: 'Failed to load sport rules' }, { status: 500 })
  }
}

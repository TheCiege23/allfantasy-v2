/**
 * Sport Rules API — returns valid roster slots, scoring, player pool, and draft options for a sport.
 * GET ?sport=NFL&format=PPR
 * Used by league creation and settings to adapt UI by sport.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getRulesForSport, isSportSupported } from '@/lib/sport-rules-engine'

const LEAGUE_SPORT_VALUES = ['NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER'] as const

function normalizeSport(s: string): (typeof LEAGUE_SPORT_VALUES)[number] {
  const u = (s || 'NFL').trim().toUpperCase()
  if (LEAGUE_SPORT_VALUES.includes(u as any)) return u as (typeof LEAGUE_SPORT_VALUES)[number]
  return 'NFL'
}

export async function GET(request: NextRequest) {
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
    return NextResponse.json(rules)
  } catch (e) {
    console.error('[sport-rules] Error:', e)
    return NextResponse.json({ error: 'Failed to load sport rules' }, { status: 500 })
  }
}

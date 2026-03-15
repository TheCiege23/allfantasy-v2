/**
 * Sport Defaults API — load defaults by sport for league creation or display.
 * GET ?sport=NFL&load=creation → full league creation payload via unified orchestrator (templates + defaults)
 * GET ?sport=NFL → raw default set (metadata, league, roster, scoring, draft, waiver)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCreationPayload } from '@/lib/league-defaults-orchestrator'
import { resolveSportDefaults } from '@/lib/sport-defaults/SportDefaultsResolver'

const LEAGUE_SPORT_VALUES = ['NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER'] as const

function toLeagueSport(s: string): (typeof LEAGUE_SPORT_VALUES)[number] {
  const u = (s || 'NFL').toUpperCase()
  if (LEAGUE_SPORT_VALUES.includes(u as any)) return u as (typeof LEAGUE_SPORT_VALUES)[number]
  return 'NFL'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sportParam = searchParams.get('sport') ?? 'NFL'
    const variantParam = searchParams.get('variant') ?? searchParams.get('leagueVariant') ?? null
    const load = searchParams.get('load') ?? ''

    const sport = toLeagueSport(sportParam)

    if (load === 'creation') {
      const payload = await getCreationPayload(sport, variantParam)
      return NextResponse.json(payload)
    }

    const defaults = resolveSportDefaults(sportParam)
    return NextResponse.json(defaults)
  } catch (e) {
    console.error('[sport-defaults] Error:', e)
    return NextResponse.json({ error: 'Failed to load sport defaults' }, { status: 500 })
  }
}

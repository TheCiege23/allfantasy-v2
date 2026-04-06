import { NextRequest, NextResponse } from 'next/server'
import { fetchRIPlayers } from '@/lib/players/ri-players-server'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { unstable_cache } from 'next/cache'

/** Seconds — Vercel Pro/hobby max; avoids timeout while RI REST returns large lists (15–30s). */
export const maxDuration = 60

const ALLOWED = new Set<string>(SUPPORTED_SPORTS as readonly string[])
const LEGACY_RI_SPORT_MAP: Record<string, string> = {
  NCAAFB: 'NCAAF',
  NCAABB: 'NCAAB',
}

function normalizeRIRouteSport(rawSport: string): string {
  const sport = rawSport.trim().toUpperCase()
  return LEGACY_RI_SPORT_MAP[sport] ?? sport
}

const cacheFetch = (sport: string) =>
  unstable_cache(
    async () => fetchRIPlayers(sport),
    ['ri-players-api', sport],
    { revalidate: 86400, tags: [`ri-players-${sport.toLowerCase()}`] }
  )

export async function GET(req: NextRequest) {
  const sport = normalizeRIRouteSport(req.nextUrl.searchParams.get('sport') || 'NFL')
  if (!ALLOWED.has(sport)) {
    return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
  }

  try {
    const players = await cacheFetch(sport)()
    return NextResponse.json({
      players,
      total: players.length,
      sport,
      cached: true,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ players: [], total: 0, error: message })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { fetchRIPlayers } from '@/lib/players/ri-players-server'
import { unstable_cache } from 'next/cache'

const ALLOWED = new Set(['NFL', 'NBA', 'MLB', 'NHL', 'NCAAFB', 'NCAABB', 'SOCCER'])

const cacheFetch = (sport: string) =>
  unstable_cache(
    async () => fetchRIPlayers(sport),
    ['ri-players-api', sport],
    { revalidate: 86400, tags: [`ri-players-${sport.toLowerCase()}`] }
  )

export async function GET(req: NextRequest) {
  const sport = (req.nextUrl.searchParams.get('sport') || 'NFL').trim().toUpperCase()
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

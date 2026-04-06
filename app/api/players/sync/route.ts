import { NextRequest, NextResponse } from 'next/server'
import { fetchRIPlayers, fetchRITeams } from '@/lib/players/ri-players-server'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { revalidateTag } from 'next/cache'

/** Seconds — Vercel Pro/hobby max; avoids timeout while RI REST returns large lists (15–30s). */
export const maxDuration = 60

const ALLOWED = new Set<string>(SUPPORTED_SPORTS as readonly string[])

export async function POST(req: NextRequest) {
  const sport = (req.nextUrl.searchParams.get('sport') || 'NFL').trim().toUpperCase()
  if (!ALLOWED.has(sport)) {
    return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
  }

  try {
    const [players, teams] = await Promise.all([fetchRIPlayers(sport), fetchRITeams(sport)])
    revalidateTag(`ri-players-${sport.toLowerCase()}`)

    return NextResponse.json({
      sport,
      players: { total: players.length, sample: players[0] ?? null },
      teams: { total: teams.length, sample: teams[0] ?? null },
      imageFieldCheck: {
        playerImg: players[0]?.headshot_url || 'none',
        teamImg: teams[0]?.logo_url || 'none',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

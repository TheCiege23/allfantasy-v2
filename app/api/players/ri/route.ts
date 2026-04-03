import { NextRequest, NextResponse } from 'next/server'
import { getCachedRiPlayerMap } from '@/lib/players/ri-players-server'

const ALLOWED = new Set(['NFL', 'NBA', 'MLB', 'NHL', 'NCAAFB', 'NCAABB', 'PGA'])

export async function GET(req: NextRequest) {
  const sport = (req.nextUrl.searchParams.get('sport') || 'NFL').trim().toUpperCase()
  if (!ALLOWED.has(sport)) {
    return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
  }

  try {
    const map = await getCachedRiPlayerMap(sport)
    return NextResponse.json(map)
  } catch {
    return NextResponse.json({})
  }
}

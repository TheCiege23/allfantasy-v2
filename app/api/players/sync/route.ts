import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { fetchRiPlayersUncached } from '@/lib/players/ri-players-server'

const ALLOWED = new Set(['NFL', 'NBA', 'MLB', 'NHL', 'NCAAFB', 'NCAABB', 'PGA'])

export async function POST(req: NextRequest) {
  const sport = (req.nextUrl.searchParams.get('sport') || 'NFL').trim().toUpperCase()
  if (!ALLOWED.has(sport)) {
    return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
  }

  try {
    revalidateTag('ri-players')
    const map = await fetchRiPlayersUncached(sport)
    return NextResponse.json({ synced: Object.keys(map).length, sport })
  } catch {
    return NextResponse.json({ synced: 0, sport })
  }
}

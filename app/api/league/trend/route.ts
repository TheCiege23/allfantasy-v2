import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Proxies Sleeper public trending endpoint (no auth). */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')?.trim() || 'add'
  const sport = req.nextUrl.searchParams.get('sport')?.trim().toLowerCase() || 'nfl'
  if (type !== 'add' && type !== 'drop') {
    return NextResponse.json({ error: 'type must be add or drop' }, { status: 400 })
  }

  const url = `https://api.sleeper.app/v1/players/${sport}/trending/${type}?lookback_hours=24&limit=25`
  try {
    const res = await fetch(url, { next: { revalidate: 120 } })
    if (!res.ok) {
      return NextResponse.json({ error: 'Trending unavailable' }, { status: 502 })
    }
    const data: unknown = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Trending fetch failed' }, { status: 502 })
  }
}

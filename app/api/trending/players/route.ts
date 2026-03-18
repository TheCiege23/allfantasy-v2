import { NextResponse } from 'next/server'
import { getTrendingPlayers } from '@/lib/trending'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined
  const sport = searchParams.get('sport') ?? undefined

  const items = await getTrendingPlayers({
    limit: limit && limit > 0 ? Math.min(limit, 50) : 20,
    sport,
  })

  return NextResponse.json({
    items,
    sport: sport ?? 'nfl',
  })
}

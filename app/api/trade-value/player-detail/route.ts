import { NextRequest, NextResponse } from 'next/server'
import { getPlayer, getPlayerNews } from '@/lib/data/players'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as any) || 'unknown'
  const rl = rateLimit(`trade-value-detail:${ip}`, 40, 60_000)
  if (!rl.success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  const id = req.nextUrl.searchParams.get('id')?.trim()
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    const row = await getPlayer(id)
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const news = await getPlayerNews(id, 6)
    return NextResponse.json({
      id: row.id,
      sport: row.sport,
      name: row.name,
      team: row.team,
      position: row.position,
      stats: row.stats,
      projections: row.projections,
      adp: row.adp,
      dynastyValue: row.dynastyValue,
      injuryStatus: row.injuryStatus,
      injuryNotes: row.injuryNotes,
      headshotUrl: row.headshotUrl ?? row.headshotUrlLg ?? row.headshotUrlSm,
      logoUrl: row.logoUrl,
      dataSource: row.dataSource,
      lastUpdated: row.lastUpdated.toISOString(),
      news: news.map((n) => ({
        headline: n.headline,
        body: n.body,
        impact: n.impact,
        publishedAt: n.publishedAt.toISOString(),
        source: n.source,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load player' }, { status: 500 })
  }
}

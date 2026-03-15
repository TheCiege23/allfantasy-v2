import { NextResponse } from 'next/server'
import { getPlayerCardAnalytics } from '@/lib/player-card-analytics'

export const dynamic = 'force-dynamic'

/**
 * POST /api/player-card-analytics
 * Body: { playerId?, playerName, position?, team?, sport?, season? }
 * Returns aggregated card: aiInsights, metaTrends, matchupPrediction, careerProjection.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const playerName = body.playerName ?? body.player_name ?? ''
    if (!playerName.trim()) {
      return NextResponse.json({ error: 'playerName is required' }, { status: 400 })
    }

    const payload = await getPlayerCardAnalytics({
      playerId: body.playerId ?? body.player_id ?? null,
      playerName: playerName.trim(),
      position: body.position ?? null,
      team: body.team ?? null,
      sport: body.sport ?? null,
      season: body.season ?? null,
    })

    return NextResponse.json(payload)
  } catch (e) {
    console.error('[player-card-analytics]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load player card' },
      { status: 500 }
    )
  }
}

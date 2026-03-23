import { NextRequest, NextResponse } from 'next/server'
import { getPlayerCardAnalytics } from '@/lib/player-card-analytics'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

/**
 * POST /api/player-card-analytics
 * Body: { playerId?, playerName, position?, team?, sport?, season? }
 * Returns aggregated card: aiInsights, metaTrends, matchupPrediction, careerProjection.
 */
function readOptionalShortText(value: unknown, maxLen = 64): string | null {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  return s.slice(0, maxLen)
}

function readOptionalSeason(value: unknown): string | null {
  const s = readOptionalShortText(value, 8)
  if (!s) return null
  return /^\d{4}$/.test(s) ? s : null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const playerNameRaw = body.playerName ?? body.player_name ?? ''
    const playerName = String(playerNameRaw ?? '').trim()
    if (!playerName.trim()) {
      return NextResponse.json({ error: 'playerName is required' }, { status: 400 })
    }
    const sportRaw = readOptionalShortText(body.sport, 16)
    if (sportRaw && !isSupportedSport(sportRaw)) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }
    const season = readOptionalSeason(body.season)
    if (body.season != null && season == null) {
      return NextResponse.json({ error: 'Invalid season' }, { status: 400 })
    }

    const payload = await getPlayerCardAnalytics({
      playerId: body.playerId ?? body.player_id ?? null,
      playerName: playerName.trim(),
      position: readOptionalShortText(body.position),
      team: readOptionalShortText(body.team, 32),
      sport: sportRaw ? normalizeToSupportedSport(sportRaw) : null,
      season,
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

/**
 * Platform Power Rankings — GET cross-league leaderboard (legacy, XP, championships, win %).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPlatformPowerLeaderboard } from '@/lib/platform-power-rankings'
import { isSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const sportRaw = url.searchParams.get('sport')?.trim()
    const sport = sportRaw && sportRaw.length > 0 ? sportRaw : undefined
    if (sport && !isSupportedSport(sport)) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }
    const limitRaw = Number.parseInt(url.searchParams.get('limit') ?? '', 10)
    const offsetRaw = Number.parseInt(url.searchParams.get('offset') ?? '', 10)

    const result = await getPlatformPowerLeaderboard({
      sport: sport || null,
      limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
      offset: Number.isFinite(offsetRaw) ? offsetRaw : undefined,
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('[platform/power-rankings]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load power rankings' },
      { status: 500 }
    )
  }
}

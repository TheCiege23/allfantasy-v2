/**
 * Platform Power Rankings — GET cross-league leaderboard (legacy, XP, championships, win %).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPlatformPowerLeaderboard } from '@/lib/platform-power-rankings'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const sport = url.searchParams.get('sport') ?? undefined
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    const result = await getPlatformPowerLeaderboard({
      sport: sport || null,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
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

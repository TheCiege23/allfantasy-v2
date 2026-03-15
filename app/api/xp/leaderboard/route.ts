/**
 * GET /api/xp/leaderboard?tier=&limit=
 * Returns XP leaderboard (managerId, totalXP, currentTier, rank).
 */

import { NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/xp-progression/ManagerXPQueryService'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const tier = url.searchParams.get('tier') ?? undefined
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50

    const list = await getLeaderboard({ tier, limit })
    return NextResponse.json({ leaderboard: list })
  } catch (e) {
    console.error('[xp/leaderboard GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load XP leaderboard' },
      { status: 500 }
    )
  }
}

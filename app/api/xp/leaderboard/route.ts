/**
 * GET /api/xp/leaderboard?tier=&limit=
 * Returns XP leaderboard (managerId, totalXP, currentTier, rank).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeaderboard } from '@/lib/xp-progression/ManagerXPQueryService'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const tier = url.searchParams.get('tier') ?? undefined
    const rawSport = url.searchParams.get('sport')
    const sport =
      rawSport == null
        ? undefined
        : isSupportedSport(rawSport)
          ? normalizeToSupportedSport(rawSport)
          : null
    if (sport === null) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50

    const list = await getLeaderboard({ tier, sport, limit })
    return NextResponse.json({ leaderboard: list })
  } catch (e) {
    console.error('[xp/leaderboard GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load XP leaderboard' },
      { status: 500 }
    )
  }
}

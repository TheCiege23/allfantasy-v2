/**
 * GET /api/gm-economy/leaderboard?orderBy=franchiseValue|gmPrestigeScore&limit=&offset=
 * Returns franchise profile leaderboard (all managers).
 */

import { NextResponse } from 'next/server'
import { listFranchiseProfiles } from '@/lib/gm-economy/GMProfileQueryService'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const orderBy = (url.searchParams.get('orderBy') === 'gmPrestigeScore'
      ? 'gmPrestigeScore'
      : 'franchiseValue') as 'franchiseValue' | 'gmPrestigeScore'
    const limitParam = url.searchParams.get('limit')
    const offsetParam = url.searchParams.get('offset')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50
    const offset = offsetParam != null ? Math.max(0, parseInt(offsetParam, 10)) : 0

    const { profiles, total } = await listFranchiseProfiles({ orderBy, limit, offset })
    return NextResponse.json({ profiles, total })
  } catch (e) {
    console.error('[gm-economy/leaderboard GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load leaderboard' },
      { status: 500 }
    )
  }
}

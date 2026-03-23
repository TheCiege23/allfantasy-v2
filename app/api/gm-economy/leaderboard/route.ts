/**
 * GET /api/gm-economy/leaderboard?orderBy=franchiseValue|gmPrestigeScore&limit=&offset=
 * Returns franchise profile leaderboard (all managers).
 */

import { NextResponse } from 'next/server'
import { listFranchiseProfiles } from '@/lib/gm-economy/GMProfileQueryService'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSupportedGMCareerSport, normalizeSportForGMCareer } from '@/lib/gm-economy/SportCareerResolver'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const orderBy = (url.searchParams.get('orderBy') === 'gmPrestigeScore'
      ? 'gmPrestigeScore'
      : 'franchiseValue') as 'franchiseValue' | 'gmPrestigeScore'
    const limitParam = url.searchParams.get('limit')
    const offsetParam = url.searchParams.get('offset')
    const rawSport = url.searchParams.get('sport')
    const sport = rawSport
      ? isSupportedGMCareerSport(rawSport)
        ? normalizeSportForGMCareer(rawSport)
        : null
      : undefined
    if (sport === null) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50
    const offset = offsetParam != null ? Math.max(0, parseInt(offsetParam, 10)) : 0

    const { profiles, total } = await listFranchiseProfiles({ orderBy, limit, offset, sport })
    return NextResponse.json({ profiles, total })
  } catch (e) {
    console.error('[gm-economy/leaderboard GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load leaderboard' },
      { status: 500 }
    )
  }
}

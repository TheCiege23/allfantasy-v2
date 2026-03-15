import { NextResponse } from 'next/server'
import { getProfileById } from '@/lib/psychological-profiles/ManagerBehaviorQueryService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/psychological-profiles/[profileId]
 * Get a single psychological profile by id.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string; profileId: string }> }
) {
  try {
    const { leagueId, profileId } = await ctx.params
    if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })

    const profile = await getProfileById(profileId)
    if (!profile || profile.leagueId !== leagueId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    return NextResponse.json(profile)
  } catch (e) {
    console.error('[psychological-profiles/[profileId] GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get profile' },
      { status: 500 }
    )
  }
}

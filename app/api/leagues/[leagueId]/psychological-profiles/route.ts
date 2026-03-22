import { NextResponse } from 'next/server'
import {
  listProfilesByLeague,
  getProfileByLeagueAndManager,
  compareManagerProfiles,
} from '@/lib/psychological-profiles/ManagerBehaviorQueryService'
import { normalizeSportForPsych } from '@/lib/psychological-profiles/SportBehaviorResolver'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leagues/[leagueId]/psychological-profiles
 * List behavior profiles for the league.
 * Query: sport, managerId (single), managerAId, managerBId, season, limit.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const url = new URL(req.url)
    const sportRaw = url.searchParams.get('sport')
    const sport = sportRaw ? (normalizeSportForPsych(sportRaw) ?? undefined) : undefined
    const seasonParam = url.searchParams.get('season')
    const season = seasonParam != null ? parseInt(seasonParam, 10) : undefined
    const managerId = url.searchParams.get('managerId') ?? undefined
    if (managerId) {
      const profile = await getProfileByLeagueAndManager(leagueId, managerId)
      return NextResponse.json({ leagueId, profile: profile ?? null })
    }

    const managerAId = url.searchParams.get('managerAId') ?? undefined
    const managerBId = url.searchParams.get('managerBId') ?? undefined
    if (managerAId && managerBId) {
      const comparison = await compareManagerProfiles(leagueId, managerAId, managerBId, sport)
      return NextResponse.json({ leagueId, sport: sport ?? null, season: season ?? null, comparison })
    }

    const limitParam = url.searchParams.get('limit')
    const limit = limitParam != null ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50

    const profiles = await listProfilesByLeague(leagueId, {
      sport,
      season: Number.isNaN(season ?? NaN) ? undefined : season,
      limit,
    })
    return NextResponse.json({ leagueId, sport: sport ?? null, season: season ?? null, profiles })
  } catch (e) {
    console.error('[psychological-profiles GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list profiles' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/league/import/fantrax/preview
 * Body: { leagueId: string }
 * Returns import preview for Fantrax league.
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leagueId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  if (!leagueId) {
    return NextResponse.json({ error: 'Fantrax League ID is required' }, { status: 400 })
  }

  try {
    const { fetchFantraxLeagueForImport } = await import(
      '@/lib/league-import/fantrax/FantraxLeagueFetchService'
    )
    const data = await fetchFantraxLeagueForImport(session.user.id, leagueId)

    if (!data) {
      return NextResponse.json({ error: 'League not found on Fantrax' }, { status: 404 })
    }

    const league = (data as { league?: { name?: string; sport?: string; size?: number } }).league
    const teams = (data as { teams?: unknown[] }).teams

    return NextResponse.json({
      provider: 'fantrax',
      leagueId,
      leagueName: league?.name ?? leagueId,
      sport: league?.sport ?? 'NFL',
      teamCount: league?.size ?? (Array.isArray(teams) ? teams.length : 0),
      seasonCount: 1,
      managers: Array.isArray(teams) ? teams : [],
      status: 'preview_ready',
    })
  } catch (e) {
    console.error('[fantrax/preview]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch Fantrax league' },
      { status: 500 },
    )
  }
}

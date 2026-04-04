import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isIdpLeague } from '@/lib/idp'
import { getAllPlayers, type SleeperPlayer } from '@/lib/sleeper-client'
import { isIdpPosition } from '@/lib/idp-kicker-values'
import { getRosteredPlayerIdsInLeague, matchesIdpPositionFilter } from '@/lib/idp/idpRouteHelpers'

export const dynamic = 'force-dynamic'

function toPublicPlayer(p: SleeperPlayer) {
  return {
    playerId: p.player_id,
    name: p.full_name || `${p.first_name} ${p.last_name}`.trim(),
    position: p.position,
    team: p.team,
    status: p.status,
  }
}

/**
 * GET /api/idp/players
 * NFL IDP player pool from Sleeper, scoped to an IDP league.
 *
 * Query:
 * - leagueId (required)
 * - pool=waiver | all — waiver = exclude anyone on a roster in this league (default waiver)
 * - position — DL | LB | DB | DE | DT | CB | S | …
 * - q — case-insensitive substring on name
 * - limit — max rows (default 50, max 150)
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const leagueId = searchParams.get('leagueId')?.trim() ?? ''
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isIdp = await isIdpLeague(leagueId)
  if (!isIdp) return NextResponse.json({ error: 'Not an IDP league' }, { status: 404 })

  const pool = (searchParams.get('pool') ?? 'waiver').toLowerCase()
  const poolWaiver = pool !== 'all'
  const positionFilter = searchParams.get('position')?.trim() ?? ''
  const q = searchParams.get('q')?.trim().toLowerCase() ?? ''
  const limit = Math.min(150, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const [all, rostered] = await Promise.all([getAllPlayers(), poolWaiver ? getRosteredPlayerIdsInLeague(leagueId) : null])

  const out: ReturnType<typeof toPublicPlayer>[] = []
  for (const p of Object.values(all)) {
    if (!p?.player_id || !isIdpPosition(p.position)) continue
    if (poolWaiver && rostered?.has(p.player_id)) continue
    if (positionFilter && !matchesIdpPositionFilter(p.position, positionFilter)) continue
    const name = (p.full_name || `${p.first_name} ${p.last_name}`).toLowerCase()
    if (q && !name.includes(q)) continue
    out.push(toPublicPlayer(p))
    if (!q && out.length >= limit) break
  }
  const players = q ? out.slice(0, limit) : out

  return NextResponse.json({
    leagueId,
    pool: poolWaiver ? 'waiver' : 'all',
    count: players.length,
    players,
  })
}

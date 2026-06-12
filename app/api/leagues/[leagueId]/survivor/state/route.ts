/**
 * GET /api/leagues/[leagueId]/survivor/state
 * Returns the canonical Survivor league state for the requesting user.
 * - Commissioner: full admin visibility.
 * - Member: user-scoped visibility (own idols/votes/tokens, no hidden other idols).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league/league-access'
import { getSurvivorLeagueState } from '@/lib/survivor/getSurvivorLeagueState'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = params
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status ?? 403 })

  const state = await getSurvivorLeagueState(leagueId, userId)
  if (!state) return NextResponse.json({ error: 'Not a Survivor league' }, { status: 404 })

  return NextResponse.json(state)
}

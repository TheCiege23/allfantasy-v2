/**
 * GET /api/leagues/[leagueId]/survivor/state
 * Returns the canonical Survivor league state for the requesting user.
 * - Commissioner: full admin visibility.
 * - Member: user-scoped visibility (own idols/votes/tokens, no hidden other idols).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildSurvivorStateForUser } from '@/lib/survivor/survivorStateService'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = params
  const result = await buildSurvivorStateForUser(leagueId, userId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json(result.state)
}

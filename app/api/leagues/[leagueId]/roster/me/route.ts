/**
 * GET: Current user's roster id in this league (for client draft UIs).
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const rosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  return NextResponse.json({ rosterId })
}

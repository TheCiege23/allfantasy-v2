/**
 * PROMPT 4: Team outlook (future capital, devy inventory, class depth, portfolio projection).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isDevyLeague, getDevyTeamOutlook } from '@/lib/devy'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  const rosterId = req.nextUrl.searchParams.get('rosterId')
  if (!rosterId) return NextResponse.json({ error: 'rosterId required' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isDevy = await isDevyLeague(leagueId)
  if (!isDevy) return NextResponse.json({ error: 'Not a devy league' }, { status: 404 })

  const outlook = await getDevyTeamOutlook({ leagueId, rosterId })
  if (!outlook) return NextResponse.json({ error: 'Outlook not available' }, { status: 404 })
  return NextResponse.json(outlook)
}

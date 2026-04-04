import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isBigBrotherLeague } from '@/lib/big-brother/BigBrotherLeagueConfig'
import { getExcludedRosterIds } from '@/lib/big-brother/bigBrotherGuard'

export const dynamic = 'force-dynamic'

/** Active (non-evicted) rosters — used for finale finalist picker. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isBB = await isBigBrotherLeague(leagueId)
  if (!isBB) return NextResponse.json({ error: 'Not a Big Brother league' }, { status: 404 })

  const excluded = await getExcludedRosterIds(leagueId)
  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true },
  })
  const finalistRosterIds = rosters.map((r) => r.id).filter((id) => !excluded.includes(id))
  return NextResponse.json({ finalistRosterIds })
}

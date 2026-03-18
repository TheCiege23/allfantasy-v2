/**
 * GET: Check if a roster can trade (zombie trade restriction). PROMPT 353.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isZombieLeague, getZombieLeagueConfig } from '@/lib/zombie/ZombieLeagueConfig'
import { getStatus } from '@/lib/zombie/ZombieOwnerStatusService'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, session.user.id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isZombie = await isZombieLeague(leagueId)
  if (!isZombie) {
    return NextResponse.json({ canTrade: true, reason: 'not_zombie_league' })
  }

  const rosterId = new URL(req.url).searchParams.get('rosterId')
  if (!rosterId) return NextResponse.json({ error: 'Missing rosterId' }, { status: 400 })

  const [config, status] = await Promise.all([
    getZombieLeagueConfig(leagueId),
    getStatus(leagueId, rosterId),
  ])

  const blocked = config?.zombieTradeBlocked && status === 'Zombie'
  return NextResponse.json({
    canTrade: !blocked,
    reason: blocked ? 'zombie_trade_blocked' : 'allowed',
    status: status ?? undefined,
  })
}

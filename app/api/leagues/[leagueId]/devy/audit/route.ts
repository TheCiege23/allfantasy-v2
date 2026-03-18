/**
 * PROMPT 3: Audit log for graduation / promotion / pool assignment. Commissioner or league member can read.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isDevyLeague } from '@/lib/devy'
import { getDevyLifecycleEvents } from '@/lib/devy'
import type { DevyLifecycleEventType } from '@/lib/devy/lifecycle/DevyAuditLog'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isDevy = await isDevyLeague(leagueId)
  if (!isDevy) return NextResponse.json({ error: 'Not a devy dynasty league' }, { status: 404 })

  const eventType = req.nextUrl.searchParams.get('eventType') as DevyLifecycleEventType | undefined
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10) || 100, 500)
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10) || 0

  const events = await getDevyLifecycleEvents({ leagueId, eventType, limit, offset })
  return NextResponse.json({ events })
}

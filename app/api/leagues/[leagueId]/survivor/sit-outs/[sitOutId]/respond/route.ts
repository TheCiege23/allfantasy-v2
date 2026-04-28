import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { respondToSurvivorSitOut } from '@/lib/survivor/SurvivorSitOutEngine'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string; sitOutId: string }> },
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, sitOutId } = await ctx.params
  if (!leagueId || !sitOutId) {
    return NextResponse.json({ error: 'Missing leagueId or sitOutId' }, { status: 400 })
  }

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const decision = typeof body.decision === 'string' ? body.decision.trim().toLowerCase() : ''
  if (decision !== 'yes' && decision !== 'no') {
    return NextResponse.json({ error: 'decision must be yes or no' }, { status: 400 })
  }

  const result = await respondToSurvivorSitOut({
    leagueId,
    sitOutId,
    responderUserId: userId,
    accept: decision === 'yes',
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    sitOutId: result.sitOutId,
    status: result.status,
  })
}

/**
 * POST: Commissioner triggers AI manager to make the current pick for an orphan roster.
 * Only works when current on-the-clock roster is orphan and orphanTeamAiManagerEnabled is on.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { executeDraftPickForOrphan } from '@/lib/orphan-ai-manager/OrphanAIManagerService'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await executeDraftPickForOrphan({
    leagueId,
    triggeredByUserId: userId,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const updated = await buildSessionSnapshot(leagueId)
  return NextResponse.json({
    ok: true,
    pick: result.pick,
    reason: result.reason,
    session: updated,
  })
}

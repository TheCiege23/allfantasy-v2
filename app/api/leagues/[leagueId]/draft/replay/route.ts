/**
 * GET: Deterministic draft replay payload (pick log + metadata) for completed drafts.
 * Auth: canAccessLeagueDraft.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { buildPostDraftSummary, ensurePostDraftFinalized } from '@/lib/post-draft'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await ensurePostDraftFinalized(leagueId).catch(() => {})
    const summary = await buildPostDraftSummary(leagueId)
    if (!summary) return NextResponse.json({ error: 'Draft not completed or no session' }, { status: 404 })
    return NextResponse.json({
      leagueId: summary.leagueId,
      leagueName: summary.leagueName,
      sport: summary.sport,
      draftType: summary.draftType,
      rounds: summary.rounds,
      teamCount: summary.teamCount,
      pickCount: summary.pickCount,
      pickLog: summary.pickLog,
    })
  } catch (e) {
    console.error('[draft/replay GET]', e)
    return NextResponse.json(
      { error: (e as Error).message ?? 'Server error' },
      { status: 500 }
    )
  }
}

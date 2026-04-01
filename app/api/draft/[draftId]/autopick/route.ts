import { NextRequest, NextResponse } from 'next/server'
import { DraftWorker } from '@/lib/workers/draft-worker'
import { requireDraftRouteUser, requireLiveDraftAccess } from '@/lib/draft/api-route-helpers'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  try {
    const userId = await requireDraftRouteUser()
    const { draftId } = await ctx.params
    const { context, currentUserRosterId } = await requireLiveDraftAccess(draftId, userId)
    const body = await req.json().catch(() => ({}))
    const requestedTeamId = String(body.teamId ?? body.team_id ?? '').trim() || currentUserRosterId || ''

    if (!requestedTeamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }

    if (!context.isCommissioner && requestedTeamId !== currentUserRosterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const worker = new DraftWorker({ viewerUserId: userId })
    const pick = await worker.autopick(draftId, requestedTeamId)
    return NextResponse.json({ ok: true, pick, state: await worker.initializeDraft(draftId) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to auto-pick'
    const status =
      message === 'Unauthorized' ? 401 :
      message === 'Forbidden' ? 403 :
      message === 'Draft not found' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

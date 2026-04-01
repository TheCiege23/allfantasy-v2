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
    await requireLiveDraftAccess(draftId, userId)
    const body = await req.json().catch(() => ({}))
    const playerId = String(body.playerId ?? body.player_id ?? '').trim()
    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
    }

    const worker = new DraftWorker({ viewerUserId: userId })
    const result = await worker.makePick(draftId, userId, playerId)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit pick'
    const status =
      message === 'Unauthorized' ? 401 :
      message === 'Forbidden' ? 403 :
      message === 'Draft not found' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

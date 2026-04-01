import { NextRequest, NextResponse } from 'next/server'
import { DraftWorker } from '@/lib/workers/draft-worker'
import { requireDraftRouteUser, requireLiveDraftAccess } from '@/lib/draft/api-route-helpers'
import { runDraftLottery } from '@/lib/workers/lottery-engine'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  try {
    const userId = await requireDraftRouteUser()
    const { draftId } = await ctx.params
    const { context } = await requireLiveDraftAccess(draftId, userId)
    if (!context.isCommissioner) {
      return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const result = await runDraftLottery(draftId, {
      finalize: Boolean(body.finalize),
      seed: typeof body.seed === 'string' ? body.seed : undefined,
    })

    const worker = new DraftWorker({ viewerUserId: userId })
    await worker.broadcastDraftState(draftId)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to run lottery'
    const status =
      message === 'Unauthorized' ? 401 :
      message === 'Forbidden' ? 403 :
      message === 'Draft not found' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

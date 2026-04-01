import { NextResponse } from 'next/server'
import { DraftWorker } from '@/lib/workers/draft-worker'
import { previewDraftLottery } from '@/lib/workers/lottery-engine'
import { requireDraftRouteUser, requireLiveDraftAccess } from '@/lib/draft/api-route-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ draftId: string }> }
) {
  try {
    const userId = await requireDraftRouteUser()
    const { draftId } = await ctx.params
    await requireLiveDraftAccess(draftId, userId)

    const worker = new DraftWorker({ viewerUserId: userId })
    const state = await worker.initializeDraft(draftId)
    const lotteryPreview = state.routeType === 'lottery'
      ? await previewDraftLottery(draftId).catch(() => null)
      : null

    return NextResponse.json({
      ok: true,
      state,
      lotteryPreview,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load draft state'
    const status =
      message === 'Unauthorized' ? 401 :
      message === 'Forbidden' ? 403 :
      message === 'Draft not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

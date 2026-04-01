import { NextRequest, NextResponse } from 'next/server'
import { DraftWorker } from '@/lib/workers/draft-worker'
import type { ADPRanking } from '@/lib/workers/adp-blender'
import { requireDraftRouteUser, requireLiveDraftAccess } from '@/lib/draft/api-route-helpers'

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
    const rankings = Array.isArray(body.rankings) ? (body.rankings as ADPRanking[]) : []
    const worker = new DraftWorker({ viewerUserId: userId })
    await worker.setCustomADP(draftId, rankings)
    return NextResponse.json({
      ok: true,
      rankings: await worker.getADP(draftId, 'custom'),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save custom ADP'
    const status =
      message === 'Unauthorized' ? 401 :
      message === 'Forbidden' ? 403 :
      message === 'Draft not found' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

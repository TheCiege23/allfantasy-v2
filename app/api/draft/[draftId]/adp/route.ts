import { NextRequest, NextResponse } from 'next/server'
import { DraftWorker } from '@/lib/workers/draft-worker'
import type { ADPSource } from '@/lib/workers/adp-blender'
import { requireDraftRouteUser, requireLiveDraftAccess } from '@/lib/draft/api-route-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  try {
    const userId = await requireDraftRouteUser()
    const { draftId } = await ctx.params
    await requireLiveDraftAccess(draftId, userId)

    const source = (req.nextUrl.searchParams.get('source') ?? 'blended') as ADPSource
    const worker = new DraftWorker({ viewerUserId: userId })
    const rankings = await worker.getADP(draftId, source)
    return NextResponse.json({ ok: true, source, rankings })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load ADP'
    const status =
      message === 'Unauthorized' ? 401 :
      message === 'Forbidden' ? 403 :
      message === 'Draft not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

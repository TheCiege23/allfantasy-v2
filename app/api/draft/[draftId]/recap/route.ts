import { NextResponse } from 'next/server'
import { buildDeterministicPostDraftRecap } from '@/lib/post-draft'
import { requireDraftRouteUser, requireLiveDraftAccess } from '@/lib/draft/api-route-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ draftId: string }> }
) {
  try {
    const userId = await requireDraftRouteUser()
    const { draftId } = await ctx.params
    const { context } = await requireLiveDraftAccess(draftId, userId)
    const recap = await buildDeterministicPostDraftRecap(context.leagueId)
    if (!recap) {
      return NextResponse.json({ error: 'Draft recap unavailable' }, { status: 400 })
    }

    return NextResponse.json({
      recap: recap.sections.chimmyDraftDebrief ?? recap.sections.leagueNarrativeRecap,
      deterministicRecap: recap.sections.leagueNarrativeRecap,
      sections: recap.sections,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load recap'
    const status =
      message === 'Unauthorized' ? 401 :
      message === 'Forbidden' ? 403 :
      message === 'Draft not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

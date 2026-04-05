import { NextResponse } from 'next/server'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { requireSupplementalDraftForLeague } from '@/lib/league/supplemental-draft-route-helpers'
import { SupplementalDraftEngine } from '@/lib/supplemental-draft/SupplementalDraftEngine'
import { requireEntitlement } from '@/lib/subscription/requireEntitlement'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, ctx: { params: Promise<{ leagueId: string; draftId: string }> }) {
  const ent = await requireEntitlement('commissioner_supplemental_draft')
  if (ent instanceof NextResponse) return ent
  const userId = ent

  const { leagueId, draftId } = await ctx.params
  if (!leagueId || !draftId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await requireSupplementalDraftForLeague(draftId, leagueId)
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 404
    return NextResponse.json({ error: 'Draft not found' }, { status })
  }

  try {
    const state = await SupplementalDraftEngine.startDraft(draftId, userId)
    return NextResponse.json(state)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Start failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

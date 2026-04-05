import { NextResponse } from 'next/server'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { requireDispersalDraftForLeague } from '@/lib/league/dispersal-draft-route-helpers'
import { DispersalDraftEngine } from '@/lib/dispersal-draft/DispersalDraftEngine'
import { requireEntitlement } from '@/lib/subscription/requireEntitlement'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, ctx: { params: Promise<{ leagueId: string; draftId: string }> }) {
  const ent = await requireEntitlement('commissioner_dispersal_draft')
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
    await requireDispersalDraftForLeague(draftId, leagueId)
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 404
    return NextResponse.json({ error: 'Draft not found' }, { status })
  }

  try {
    const state = await DispersalDraftEngine.startDraft(draftId, userId)
    return NextResponse.json(state)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Start failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

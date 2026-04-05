import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  canSubmitPickForRoster,
  getCurrentUserRosterIdForLeague,
} from '@/lib/live-draft-engine/auth'
import { requireSupplementalDraftForLeague } from '@/lib/league/supplemental-draft-route-helpers'
import { SupplementalDraftEngine } from '@/lib/supplemental-draft/SupplementalDraftEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ leagueId: string; draftId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, draftId } = await ctx.params
  if (!leagueId || !draftId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  try {
    await requireSupplementalDraftForLeague(draftId, leagueId)
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 404
    return NextResponse.json({ error: 'Draft not found' }, { status })
  }

  const body = (await req.json().catch(() => ({}))) as { assetId?: string; rosterId?: string }
  const assetId = typeof body.assetId === 'string' ? body.assetId : ''
  if (!assetId) return NextResponse.json({ error: 'assetId required' }, { status: 400 })

  let rosterId = typeof body.rosterId === 'string' ? body.rosterId.trim() : ''
  if (!rosterId) {
    const mine = await getCurrentUserRosterIdForLeague(leagueId, userId)
    if (!mine) return NextResponse.json({ error: 'No roster in this league' }, { status: 403 })
    rosterId = mine
  }

  if (!(await canSubmitPickForRoster(leagueId, userId, rosterId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const state = await SupplementalDraftEngine.makePick(draftId, rosterId, assetId)
    return NextResponse.json(state)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Pick failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

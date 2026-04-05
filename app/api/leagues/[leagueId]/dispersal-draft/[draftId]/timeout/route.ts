import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  canSubmitPickForRoster,
  getCurrentUserRosterIdForLeague,
} from '@/lib/live-draft-engine/auth'
import { requireDispersalDraftForLeague } from '@/lib/league/dispersal-draft-route-helpers'
import { DispersalDraftEngine } from '@/lib/dispersal-draft/DispersalDraftEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ leagueId: string; draftId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, draftId } = await ctx.params
  if (!leagueId || !draftId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  try {
    await requireDispersalDraftForLeague(draftId, leagueId)
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 404
    return NextResponse.json({ error: 'Draft not found' }, { status })
  }

  const body = (await req.json().catch(() => ({}))) as { rosterId?: string }
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
    const state = await DispersalDraftEngine.advancePickOnTimeout(draftId, rosterId)
    return NextResponse.json(state)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Advance failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

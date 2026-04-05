import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { requireDispersalDraftForLeague } from '@/lib/league/dispersal-draft-route-helpers'
import { DispersalDraftEngine } from '@/lib/dispersal-draft/DispersalDraftEngine'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ leagueId: string; draftId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, draftId } = await ctx.params
  if (!leagueId || !draftId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  if (!(await canAccessLeagueDraft(leagueId, userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await requireDispersalDraftForLeague(draftId, leagueId)
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 404
    return NextResponse.json({ error: 'Draft not found' }, { status })
  }

  const state = await DispersalDraftEngine.getDraftState(draftId)
  if (!state) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  return NextResponse.json(state)
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isCommissioner } from '@/lib/commissioner/permissions'
import { requireSupplementalDraftForLeague } from '@/lib/league/supplemental-draft-route-helpers'
import { SupplementalDraftEngine } from '@/lib/supplemental-draft/SupplementalDraftEngine'
import { prisma } from '@/lib/prisma'

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

  const body = (await req.json().catch(() => ({}))) as { rosterId?: string; remove?: boolean }
  const rosterId = typeof body.rosterId === 'string' ? body.rosterId.trim() : ''
  if (!rosterId) return NextResponse.json({ error: 'rosterId required' }, { status: 400 })

  const remove = body.remove === true
  const comm = await isCommissioner(leagueId, userId)

  if (remove) {
    if (!comm) return NextResponse.json({ error: 'Only the commissioner can remove pass status.' }, { status: 403 })
    try {
      await SupplementalDraftEngine.removePassByCommissioner(draftId, rosterId)
      const state = await SupplementalDraftEngine.getDraftState(draftId)
      return NextResponse.json({ ok: true, draft: state })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Pass update failed'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  const roster = await prisma.roster.findFirst({
    where: { id: rosterId, leagueId },
    select: { platformUserId: true },
  })
  if (!roster) return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
  if (roster.platformUserId !== userId) {
    return NextResponse.json({ error: 'You can only pass for your own roster.' }, { status: 403 })
  }

  try {
    const state = await SupplementalDraftEngine.makePick(draftId, rosterId, 'PASS')
    return NextResponse.json({ ok: true, draft: state })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Pass update failed'
    const st = msg === 'Not your pick' || msg.includes('Not your pick') ? 409 : 400
    return NextResponse.json({ error: msg }, { status: st })
  }
}

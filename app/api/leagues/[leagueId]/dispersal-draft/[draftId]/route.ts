import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { getLeagueRole } from '@/lib/league/permissions'
import {
  getRosterIdForLeagueUser,
  requireDispersalDraftForLeague,
} from '@/lib/league/dispersal-draft-route-helpers'
import { getDispersalDraftDetail } from '@/lib/dispersal-draft/dispersal-draft-detail'
import { DispersalDraftEngine } from '@/lib/dispersal-draft/DispersalDraftEngine'
import { requireEntitlement } from '@/lib/subscription/requireEntitlement'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ leagueId: string; draftId: string }> }) {
  try {
    const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { leagueId, draftId } = await ctx.params
    if (!leagueId || !draftId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    if (!(await canAccessLeagueDraft(leagueId, userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const detail = await getDispersalDraftDetail(leagueId, draftId)
    if (!detail) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    return NextResponse.json(detail)
  } catch (err) {
    console.error('[dispersal-draft]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

type PatchBody = {
  action?: string
  playerId?: string
  isAutoPick?: boolean
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ leagueId: string; draftId: string }> }) {
  try {
    const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { leagueId, draftId } = await ctx.params
    if (!leagueId || !draftId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    if (!(await canAccessLeagueDraft(leagueId, userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await requireDispersalDraftForLeague(draftId, leagueId)

    const body = (await req.json().catch(() => ({}))) as PatchBody
    const action = body.action

    if (action === 'start') {
      const ent = await requireEntitlement('commissioner_dispersal_draft')
      if (ent instanceof NextResponse) return ent
      const uid = ent
      const role = await getLeagueRole(leagueId, uid)
      if (role !== 'commissioner' && role !== 'co_commissioner') {
        return NextResponse.json({ error: 'Only the commissioner or co-commissioner can start the draft.' }, { status: 403 })
      }
      try {
        const state = await DispersalDraftEngine.startDraft(draftId, uid)
        const detail = await getDispersalDraftDetail(leagueId, draftId)
        return NextResponse.json({ state, detail })
      } catch (e) {
        console.error('[dispersal-draft]', e)
        const msg = e instanceof Error ? e.message : 'Start failed'
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    if (action === 'make_pick') {
      const pid = typeof body.playerId === 'string' ? body.playerId.trim() : ''
      if (!pid) return NextResponse.json({ error: 'playerId required' }, { status: 400 })
      const rosterId = await getRosterIdForLeagueUser(leagueId, userId)
      if (!rosterId) return NextResponse.json({ error: 'No roster for user in this league' }, { status: 400 })
      try {
        const state = await DispersalDraftEngine.makePick(draftId, rosterId, pid, {
          isAutoPick: body.isAutoPick === true,
        })
        const detail = await getDispersalDraftDetail(leagueId, draftId)
        return NextResponse.json({ state, detail })
      } catch (e) {
        console.error('[dispersal-draft]', e)
        const msg = e instanceof Error ? e.message : 'Pick failed'
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    if (action === 'auto_pick') {
      const rosterId = await getRosterIdForLeagueUser(leagueId, userId)
      if (!rosterId) return NextResponse.json({ error: 'No roster for user in this league' }, { status: 400 })
      try {
        const state = await DispersalDraftEngine.advancePickOnTimeout(draftId, rosterId)
        const detail = await getDispersalDraftDetail(leagueId, draftId)
        return NextResponse.json({ state, detail })
      } catch (e) {
        console.error('[dispersal-draft]', e)
        const msg = e instanceof Error ? e.message : 'Auto-pick failed'
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[dispersal-draft]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

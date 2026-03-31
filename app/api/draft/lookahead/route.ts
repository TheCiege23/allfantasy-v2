import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { sendDraftIntelDm } from '@/lib/draft-intelligence'
import { publishDraftIntelState } from '@/lib/draft-intelligence'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : ''
  const trigger = typeof body.trigger === 'string' ? body.trigger : 'manual'
  const notify = body.notify !== false
  if (!leagueId) return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const state = await publishDraftIntelState({
    leagueId,
    userId,
    trigger:
      trigger === 'n_minus_5' ||
      trigger === 'pick_update' ||
      trigger === 'on_clock' ||
      trigger === 'reply'
        ? trigger
        : 'manual',
  })
  if (!state) return NextResponse.json({ error: 'Draft intel unavailable' }, { status: 400 })

  const dmResult = notify ? await sendDraftIntelDm(state) : { threadId: null, sent: false }
  return NextResponse.json({ ok: true, state, dm: dmResult })
}

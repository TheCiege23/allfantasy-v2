import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessLeague } from '@/lib/draft/access'
import { syncDraftFromSleeper } from '@/lib/draft/sleeperSync'

export const dynamic = 'force-dynamic'

/** POST { draftId: internal DraftSession id, sleeperDraftId?: string } */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const draftId = typeof body?.draftId === 'string' ? body.draftId.trim() : ''
  let sleeperDraftId = typeof body?.sleeperDraftId === 'string' ? body.sleeperDraftId.trim() : ''

  if (!draftId) {
    return NextResponse.json({ error: 'draftId required' }, { status: 400 })
  }

  const ds = await prisma.draftSession.findFirst({
    where: { id: draftId },
    select: { leagueId: true, sleeperDraftId: true },
  })
  if (!ds) {
    return NextResponse.json({ error: 'Draft session not found' }, { status: 404 })
  }

  const allowed = await canAccessLeague(ds.leagueId, userId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!sleeperDraftId && ds.sleeperDraftId) {
    sleeperDraftId = ds.sleeperDraftId
  }
  if (!sleeperDraftId) {
    return NextResponse.json({ error: 'sleeperDraftId required' }, { status: 400 })
  }

  await syncDraftFromSleeper(sleeperDraftId, draftId)

  return NextResponse.json({ ok: true })
}

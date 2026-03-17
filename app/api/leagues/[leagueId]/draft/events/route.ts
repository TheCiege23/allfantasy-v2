/**
 * GET: Poll for draft events (since=timestamp). Returns session snapshot when updatedAt > since.
 * Realtime: client polls this or GET session; no WebSocket in this implementation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const since = url.searchParams.get('since')
  const draftSession = await prisma.draftSession.findUnique({
    where: { leagueId },
    select: { updatedAt: true },
  })
  if (!draftSession) {
    return NextResponse.json({ leagueId, updated: false, session: null })
  }

  const updatedAt = draftSession.updatedAt.toISOString()
  if (since && new Date(since).getTime() >= draftSession.updatedAt.getTime()) {
    return NextResponse.json({ leagueId, updated: false, updatedAt })
  }

  const snapshot = await buildSessionSnapshot(leagueId)
  return NextResponse.json({ leagueId, updated: true, updatedAt, session: snapshot })
}

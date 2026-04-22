/**
 * POST: vote on a draft-room poll backed by LeagueChatMessage (type=poll).
 * Same vote shape as bracket pool polls; scoped to league draft access.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> },
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const messageId = typeof body?.messageId === 'string' ? body.messageId.trim() : ''
  const optionIndex = Number(body?.optionIndex)
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })
  if (!Number.isInteger(optionIndex) || optionIndex < 0) {
    return NextResponse.json({ error: 'optionIndex required (non-negative integer)' }, { status: 400 })
  }

  const msg = await prisma.leagueChatMessage.findFirst({
    where: { id: messageId, leagueId },
    select: { id: true, type: true, metadata: true },
  })
  if (!msg || msg.type !== 'poll' || !msg.metadata || typeof msg.metadata !== 'object') {
    return NextResponse.json({ error: 'Not a valid poll in this draft' }, { status: 400 })
  }

  const meta = msg.metadata as Record<string, unknown>
  const options = Array.isArray(meta.options) ? meta.options.map((o) => String(o)) : []
  if (optionIndex >= options.length) {
    return NextResponse.json({ error: 'Invalid option index' }, { status: 400 })
  }
  if (meta.closed === true) {
    return NextResponse.json({ error: 'Poll is closed' }, { status: 400 })
  }

  const votes: Record<string, string[]> =
    meta.votes && typeof meta.votes === 'object' && meta.votes !== null
      ? { ...(meta.votes as Record<string, string[]>) }
      : {}
  for (const key of Object.keys(votes)) {
    votes[key] = (votes[key] || []).filter((id) => id !== userId)
  }
  const optKey = String(optionIndex)
  if (!votes[optKey]) votes[optKey] = []
  if (!votes[optKey].includes(userId)) votes[optKey].push(userId)

  await prisma.leagueChatMessage.update({
    where: { id: messageId },
    data: { metadata: { ...meta, votes } },
  })

  return NextResponse.json({ ok: true })
}

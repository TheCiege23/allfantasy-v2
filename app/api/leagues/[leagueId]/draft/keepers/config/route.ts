/**
 * PATCH: Set keeper config (maxKeepers, deadline, maxKeepersPerPosition). Commissioner only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { prisma } from '@/lib/prisma'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const draft = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (!draft) return NextResponse.json({ error: 'No draft session' }, { status: 404 })
  if (draft.status !== 'pre_draft') {
    return NextResponse.json({ error: 'Keeper config cannot be changed after draft has started' }, { status: 400 })
  }

  const current = (draft.keeperConfig ?? (draft as any).keeperConfig) as Record<string, unknown> | null
  const next: Record<string, unknown> = current && typeof current === 'object' ? { ...current } : { maxKeepers: 0 }

  if (typeof body.maxKeepers === 'number' && body.maxKeepers >= 0) {
    next.maxKeepers = Math.min(50, Math.round(body.maxKeepers))
  }
  if (body.deadline !== undefined) next.deadline = body.deadline ? String(body.deadline) : null
  if (body.maxKeepersPerPosition !== undefined) {
    next.maxKeepersPerPosition =
      body.maxKeepersPerPosition && typeof body.maxKeepersPerPosition === 'object'
        ? body.maxKeepersPerPosition
        : undefined
  }

  await prisma.draftSession.update({
    where: { id: draft.id },
    data: { keeperConfig: next as any, version: { increment: 1 }, updatedAt: new Date() },
  })

  const snapshot = await buildSessionSnapshot(leagueId)
  return NextResponse.json({ ok: true, config: next, session: snapshot })
}

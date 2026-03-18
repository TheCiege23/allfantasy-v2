/**
 * Mock-only chat: no league sync. GET list, POST send.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessMockDraft } from '@/lib/mock-draft-engine/MockDraftSessionService'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  const { draftId } = await ctx.params
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

  const allowed = await canAccessMockDraft(draftId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const messages = await prisma.mockDraftChat.findMany({
    where: { mockDraftId: draftId },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
  const list = messages.map((m) => ({
    id: m.id,
    userId: m.userId,
    displayName: m.displayName,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }))
  return NextResponse.json({ draftId, messages: list })
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ draftId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { draftId } = await ctx.params
  if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

  const allowed = await canAccessMockDraft(draftId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const content = String(body.content ?? body.message ?? '').trim().slice(0, 2000)
  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const displayName = (session?.user as any)?.name ?? (session?.user as any)?.email ?? 'User'
  const msg = await prisma.mockDraftChat.create({
    data: {
      mockDraftId: draftId,
      userId,
      displayName,
      content,
    },
  })
  return NextResponse.json({
    id: msg.id,
    userId: msg.userId,
    displayName: msg.displayName,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  })
}

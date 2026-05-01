import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const UpdateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const conversation = await prisma.chatConversation.findUnique({
      where: { id },
      select: { id: true, userId: true, title: true, messageCount: true, lastMessageAt: true, dataSources: true, createdAt: true, updatedAt: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const messages = await prisma.chatHistory.findMany({
      where: { conversationId: id },
      select: { id: true, conversationId: true, role: true, content: true, meta: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ conversation, messages })
  } catch (err: unknown) {
    console.error('[GET /api/chimmy/conversations/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const body = await req.json().catch(() => ({}))
    const payload = UpdateConversationSchema.parse(body)

    if (!payload.title) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const existing = await prisma.chatConversation.findUnique({ where: { id }, select: { userId: true } })
    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.chatConversation.update({
      where: { id },
      data: { title: payload.title },
      select: { id: true, title: true, messageCount: true, lastMessageAt: true, updatedAt: true },
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    console.error('[PATCH /api/chimmy/conversations/:id] error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', issues: err.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.chatConversation.findUnique({ where: { id }, select: { userId: true } })
    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.chatHistory.deleteMany({ where: { conversationId: id } }),
      prisma.chatConversation.delete({ where: { id } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[DELETE /api/chimmy/conversations/:id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

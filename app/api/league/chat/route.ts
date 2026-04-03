import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createLeagueChatMessage,
  getLeagueChatMessages,
} from '@/lib/league-chat/LeagueChatMessageService'

function toStringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

async function canAccessLeague(leagueId: string, userId: string) {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: {
      id: true,
      userId: true,
      teams: {
        select: {
          claimedByUserId: true,
        },
      },
    },
  })

  if (!league) return false
  if (league.userId === userId) return true
  return league.teams.some((team) => team.claimedByUserId === userId)
}

function toClientMessage(message: {
  id: string
  senderName: string | null
  senderAvatarUrl: string | null
  body: string
  createdAt: string
  messageType?: string | null
  metadata?: Record<string, unknown> | null
}) {
  return {
    id: message.id,
    authorName: message.senderName ?? 'Manager',
    authorAvatar: message.senderAvatarUrl ?? null,
    text: message.body,
    createdAt: message.createdAt,
    messageType: message.messageType ?? 'text',
    metadata: message.metadata ?? null,
  }
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }

  const allowed = await canAccessLeague(leagueId, userId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || '50'), 100)
  const messages = await getLeagueChatMessages(leagueId, { limit })

  return NextResponse.json({
    messages: messages.map((message) =>
      toClientMessage({
        id: message.id,
        senderName: message.senderName ?? null,
        senderAvatarUrl: message.senderAvatarUrl ?? null,
        body: message.body,
        createdAt: message.createdAt,
        messageType: message.messageType ?? 'text',
        metadata: message.metadata ?? null,
      })
    ),
  })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const leagueId = toStringValue(body?.leagueId).trim()
  const message = toStringValue(body?.message).trim()
  const metadataRaw = body?.metadata
  const metadata =
    metadataRaw && typeof metadataRaw === 'object' && !Array.isArray(metadataRaw)
      ? (metadataRaw as Record<string, unknown>)
      : undefined

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }

  const metaStr = metadata ? JSON.stringify(metadata) : ''
  if (metaStr.length > 120_000) {
    return NextResponse.json({ error: 'Metadata too large' }, { status: 400 })
  }

  const hasRich =
    Boolean(metadata && Object.keys(metadata).length > 0) ||
    Boolean(toStringValue(body?.gifId)) ||
    Boolean(body?.poll) ||
    (Array.isArray(body?.attachments) && body.attachments.length > 0)

  if (!message && !hasRich) {
    return NextResponse.json({ error: 'message or media payload required' }, { status: 400 })
  }
  if (message.length > 1000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }

  const allowed = await canAccessLeague(leagueId, userId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const bodyText =
    message ||
    (metadata?.gifUrl || metadata?.giphyId || metadata?.gifId ? '🎬 GIF' : '') ||
    (metadata?.poll ? '📊 Poll' : '') ||
    (metadata?.attachments ? '📎 Media' : '') ||
    '[Media]'

  const created = await createLeagueChatMessage(leagueId, userId, bodyText, {
    metadata: metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
  })
  if (!created) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return NextResponse.json({
    message: toClientMessage({
      id: created.id,
      senderName: created.senderName ?? 'Manager',
      senderAvatarUrl: created.senderAvatarUrl ?? null,
      body: created.body,
      createdAt: created.createdAt,
      messageType: created.messageType ?? 'text',
      metadata: created.metadata ?? null,
    }),
  })
}

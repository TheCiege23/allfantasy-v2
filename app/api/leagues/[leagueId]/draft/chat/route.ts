/**
 * Draft room chat. When liveDraftChatSyncEnabled and draft active: same as league chat.
 * When sync off: draft-only messages (source='draft'). Only league managers can access.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { getLeagueChatMessages, createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'
import { parseMentions } from '@/lib/league-chat'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function toDraftMessage(m: {
  id: string
  senderName: string | null
  body: string
  createdAt: string
  messageType?: string
  metadata?: { imageUrl?: string; mediaUrl?: string; mentions?: string[]; lastActiveAt?: string } | null
}) {
  const metadata = m.metadata ?? null
  const normalizedType = String(m.messageType ?? 'text').toLowerCase()
  return {
    id: m.id,
    from: m.senderName ?? 'User',
    text: m.body,
    at: m.createdAt,
    isBroadcast: normalizedType === 'broadcast',
    messageType: normalizedType,
    mediaUrl:
      metadata?.mediaUrl ??
      metadata?.imageUrl ??
      null,
    mentions: Array.isArray(metadata?.mentions) ? metadata?.mentions : [],
    lastActiveAt: typeof metadata?.lastActiveAt === 'string' ? metadata.lastActiveAt : null,
  }
}

function isActiveLiveDraftStatus(status: string | null | undefined): boolean {
  return status === 'in_progress'
}

function parseChatMediaPayload(text: string): {
  body: string
  type: string
  imageUrl: string | null
  mediaUrl: string | null
} {
  const token = text.match(/^\[(GIF|IMAGE|VIDEO|LINK|MEME)\]\s*(.*)$/i)
  const urlRegex = /(https?:\/\/[^\s]+)/i
  const mediaTypeMap: Record<string, string> = {
    GIF: 'gif',
    IMAGE: 'image',
    VIDEO: 'video',
    LINK: 'link',
    MEME: 'meme',
  }

  if (token) {
    const kind = String(token[1] || '').toUpperCase()
    const rest = String(token[2] || '').trim()
    const url = rest.match(urlRegex)?.[1] ?? null
    const type = mediaTypeMap[kind] ?? 'text'
    if (type === 'image') {
      return { body: rest || text, type, imageUrl: url, mediaUrl: url }
    }
    return { body: rest || text, type, imageUrl: null, mediaUrl: url }
  }

  const url = text.match(urlRegex)?.[1] ?? null
  if (!url) {
    return { body: text, type: 'text', imageUrl: null, mediaUrl: null }
  }

  const lowerUrl = url.toLowerCase()
  if (/\.(gif)(\?.*)?$/.test(lowerUrl)) {
    return { body: text, type: 'gif', imageUrl: null, mediaUrl: url }
  }
  if (/\.(png|jpg|jpeg|webp)(\?.*)?$/.test(lowerUrl)) {
    return { body: text, type: 'image', imageUrl: url, mediaUrl: url }
  }
  if (/\.(mp4|webm|mov)(\?.*)?$/.test(lowerUrl)) {
    return { body: text, type: 'video', imageUrl: null, mediaUrl: url }
  }
  return { body: text, type: 'link', imageUrl: null, mediaUrl: url }
}

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

  const [draftSession, uiSettings] = await Promise.all([
    prisma.draftSession.findUnique({ where: { leagueId }, select: { status: true } }),
    getDraftUISettingsForLeague(leagueId),
  ])
  const syncOn = Boolean(uiSettings.liveDraftChatSyncEnabled) && isActiveLiveDraftStatus(draftSession?.status)
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || '80'), 100)
  const before = req.nextUrl.searchParams.get('before')

  const messages = await getLeagueChatMessages(leagueId, {
    limit,
    before: before ? new Date(before) : undefined,
    source: syncOn ? undefined : 'draft',
  })
  return NextResponse.json({
    messages: messages.map(toDraftMessage),
    syncActive: syncOn,
  })
}

export async function POST(
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

  const body = await req.json().catch(() => ({}))
  const text = String(body?.text ?? body?.message ?? body?.body ?? '').trim()
  if (!text) return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (text.length > 1000) return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  const imageUrl =
    typeof body?.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null

  const [draftSession, uiSettings] = await Promise.all([
    prisma.draftSession.findUnique({ where: { leagueId }, select: { status: true } }),
    getDraftUISettingsForLeague(leagueId),
  ])
  const syncOn = Boolean(uiSettings.liveDraftChatSyncEnabled) && isActiveLiveDraftStatus(draftSession?.status)
  const mediaPayload = parseChatMediaPayload(text)
  const mentions = parseMentions(text)
  const metadata: Record<string, unknown> = {}
  if (mentions.length > 0) metadata.mentions = mentions
  if (mediaPayload.mediaUrl) metadata.mediaUrl = mediaPayload.mediaUrl

  const created = await createLeagueChatMessage(leagueId, userId, mediaPayload.body, {
    type: imageUrl ? 'image' : mediaPayload.type,
    imageUrl: imageUrl ?? mediaPayload.imageUrl,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    source: syncOn ? null : 'draft',
  })
  if (!created) return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  return NextResponse.json({
    message: toDraftMessage(created),
    syncActive: syncOn,
  })
}

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
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function toDraftMessage(m: {
  id: string
  senderName: string | null
  body: string
  createdAt: string
  messageType?: string
  metadata?: { imageUrl?: string } | null
}) {
  return {
    id: m.id,
    from: m.senderName ?? 'User',
    text: m.body,
    at: m.createdAt,
    isBroadcast: (m as any).messageType === 'broadcast',
    ...(m.metadata?.imageUrl && { imageUrl: m.metadata.imageUrl }),
  }
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
  const syncOn = uiSettings.liveDraftChatSyncEnabled && draftSession?.status && ['in_progress', 'paused'].includes(draftSession.status)
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
  const syncOn = uiSettings.liveDraftChatSyncEnabled && draftSession?.status && ['in_progress', 'paused'].includes(draftSession.status)

  const created = await createLeagueChatMessage(leagueId, userId, text, {
    type: imageUrl ? 'image' : 'text',
    imageUrl,
    source: syncOn ? null : 'draft',
  })
  if (!created) return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  return NextResponse.json({
    message: toDraftMessage(created),
    syncActive: syncOn,
  })
}

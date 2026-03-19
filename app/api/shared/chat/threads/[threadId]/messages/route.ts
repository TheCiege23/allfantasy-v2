import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { createPlatformThreadMessage, getPlatformThreadMessages } from '@/lib/platform/chat-service'
import { isLeagueVirtualRoom, getLeagueIdFromVirtualRoom } from '@/lib/chat-core'
import { bracketMessagesToPlatform } from '@/lib/chat-core/league-message-proxy'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { getLeagueChatMessages } from '@/lib/league-chat/LeagueChatMessageService'
import { parseTribeIdFromSource } from '@/lib/survivor/constants'
import { getTribeChatMemberRosterIds } from '@/lib/survivor/SurvivorChatMembershipService'
import { processSurvivorOfficialCommand } from '@/lib/survivor/SurvivorOfficialCommandService'
import { resolveSurvivorCurrentWeek } from '@/lib/survivor/SurvivorTimelineResolver'
import { isMergeTriggered } from '@/lib/survivor/SurvivorMergeEngine'
import { prisma } from '@/lib/prisma'
import { getBlockedUserIds } from '@/lib/moderation'
import { filterMessagesByBlocked } from '@/lib/moderation'

const bracketMessageInclude = {
  user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
}

function normalizeLeagueChatSource(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'league') return null
  return trimmed
}

async function canAccessSurvivorTribeSource(
  leagueId: string,
  userId: string,
  source: string | null | undefined
): Promise<boolean> {
  if (!source) return true
  const tribeId = parseTribeIdFromSource(source)
  if (!tribeId) return true
  const currentWeek = await resolveSurvivorCurrentWeek(leagueId).catch(() => 1)
  const merged = await isMergeTriggered(leagueId, currentWeek).catch(() => false)
  if (merged) return false
  const rosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  if (!rosterId) return false
  const memberRosterIds = await getTribeChatMemberRosterIds(tribeId)
  return memberRosterIds.includes(rosterId)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threadId = decodeURIComponent(params.threadId)
  const limit = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get('limit') || '50'), 100))
  const source = normalizeLeagueChatSource(
    req.nextUrl.searchParams.has('source') ? req.nextUrl.searchParams.get('source') : undefined
  )

  if (isLeagueVirtualRoom(threadId)) {
    const leagueId = getLeagueIdFromVirtualRoom(threadId)
    if (!leagueId) return NextResponse.json({ error: 'Invalid league room' }, { status: 400 })
    const member = await (prisma as any).bracketLeagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: user.appUserId } },
    })
    if (member) {
      const cursor = req.nextUrl.searchParams.get('before')
      const rows = await (prisma as any).bracketLeagueMessage.findMany({
        where: {
          leagueId,
          ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: bracketMessageInclude,
      })
      const messages = bracketMessagesToPlatform(rows.reverse(), threadId)
      return NextResponse.json({ status: 'ok', messages })
    }
    const mainLeagueAccess = await canAccessLeagueDraft(leagueId, user.appUserId)
    if (mainLeagueAccess) {
      const sourceAllowed = await canAccessSurvivorTribeSource(leagueId, user.appUserId, source)
      if (!sourceAllowed) {
        return NextResponse.json({ error: 'Not allowed to access this tribe chat' }, { status: 403 })
      }
      const cursor = req.nextUrl.searchParams.get('before')
      const messages = await getLeagueChatMessages(leagueId, {
        limit,
        before: cursor ? new Date(cursor) : undefined,
        source,
      })
      return NextResponse.json({ status: 'ok', messages })
    }
    return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  }

  let messages = await getPlatformThreadMessages(user.appUserId, threadId, limit)
  const blockedIds = await getBlockedUserIds(user.appUserId)
  if (blockedIds.length > 0) {
    const blockSet = new Set(blockedIds)
    messages = filterMessagesByBlocked(messages, blockSet)
  }
  return NextResponse.json({ status: 'ok', messages })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threadId = decodeURIComponent(params.threadId)
  const body = await req.json().catch(() => ({}))
  const message = String(body?.body || body?.message || '').trim()
  const messageType = String(body?.messageType || 'text')
  const source = normalizeLeagueChatSource(body?.source)

  if (!message) {
    return NextResponse.json({ error: 'Message body required' }, { status: 400 })
  }
  const maxLength = ['image', 'gif', 'file'].includes(messageType) ? 2000 : 1000
  if (message.length > maxLength) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }

  if (isLeagueVirtualRoom(threadId)) {
    const leagueId = getLeagueIdFromVirtualRoom(threadId)
    if (!leagueId) return NextResponse.json({ error: 'Invalid league room' }, { status: 400 })
    const member = await (prisma as any).bracketLeagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: user.appUserId } },
    })
    if (member) {
      const created = await (prisma as any).bracketLeagueMessage.create({
        data: {
          leagueId,
          userId: user.appUserId,
          message,
          type: 'text',
        },
        include: bracketMessageInclude,
      })
      const mapped = bracketMessagesToPlatform([created], threadId)[0]
      return NextResponse.json({ status: 'ok', message: mapped })
    }
    const mainLeagueAccess = await canAccessLeagueDraft(leagueId, user.appUserId)
    if (mainLeagueAccess) {
      const sourceAllowed = await canAccessSurvivorTribeSource(leagueId, user.appUserId, source)
      if (!sourceAllowed) {
        return NextResponse.json({ error: 'Not allowed to post in this tribe chat' }, { status: 403 })
      }
      const commandResult = await processSurvivorOfficialCommand({
        leagueId,
        userId: user.appUserId,
        command: message,
        source,
      })
      if (commandResult.handled && !commandResult.ok) {
        return NextResponse.json({ error: commandResult.error ?? 'Survivor command failed' }, { status: commandResult.status ?? 400 })
      }
      const { createLeagueChatMessage } = await import('@/lib/league-chat/LeagueChatMessageService')
      const imageUrl =
        typeof body?.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null
      const metadata =
        body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
          ? (body.metadata as Record<string, unknown>)
          : undefined
      const created = await createLeagueChatMessage(leagueId, user.appUserId, message, {
        type: messageType as 'text',
        imageUrl,
        metadata,
        source,
      })
      return NextResponse.json({
        status: 'ok',
        message: created,
        commandResult: commandResult.handled
          ? {
              ok: commandResult.ok,
              intent: commandResult.intent,
              message: commandResult.message,
            }
          : null,
      })
    }
    return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  }

  const metadata =
    body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined

  const created = await createPlatformThreadMessage(
    user.appUserId,
    threadId,
    message,
    messageType,
    metadata,
  )

  if (!created) {
    return NextResponse.json({ error: 'Unable to send message' }, { status: 400 })
  }

  return NextResponse.json({ status: 'ok', message: created })
}

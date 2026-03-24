import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { createPlatformThread, getPlatformChatThreads } from '@/lib/platform/chat-service'
import { resolveConversationSafetyForUser } from '@/lib/moderation'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ status: 'ok', threads: [] })
  }

  const threads = await getPlatformChatThreads(user.appUserId)
  const resolved = await resolveConversationSafetyForUser(user.appUserId, threads)
  return NextResponse.json({ status: 'ok', threads: resolved.threads })
}

export async function POST(req: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const threadType = String(body?.threadType || '') as 'dm' | 'group' | 'ai'

  if (!['dm', 'group', 'ai'].includes(threadType)) {
    return NextResponse.json({ error: 'Unsupported threadType' }, { status: 400 })
  }

  let memberUserIds: string[] = []
  let resolvedFromUsernames = 0

  if (threadType === 'group' && Array.isArray(body?.usernames)) {
    const usernames = (body.usernames as unknown[]).map((u) => String(u).trim()).filter(Boolean)
    if (usernames.length > 0) {
      const users = await prisma.appUser.findMany({
        where: { username: { in: usernames } },
        select: { id: true },
      })
      memberUserIds = users.map((u) => u.id).filter((id) => id !== user.appUserId)
      resolvedFromUsernames = memberUserIds.length
    }
  }

  if (memberUserIds.length === 0 && Array.isArray(body?.memberUserIds)) {
    memberUserIds = body.memberUserIds.map((v: unknown) => String(v)).filter(Boolean)
  }

  if (threadType === 'group') {
    const uniqueMembers = Array.from(new Set(memberUserIds.filter(Boolean))).filter((id) => id !== user.appUserId)
    if (Array.isArray(body?.usernames) && body.usernames.length > 0 && resolvedFromUsernames === 0) {
      return NextResponse.json({ error: 'No valid participants found for those usernames' }, { status: 400 })
    }
    if (uniqueMembers.length === 0) {
      return NextResponse.json({ error: 'At least one participant is required to create a group' }, { status: 400 })
    }
    memberUserIds = uniqueMembers
  }

  const created = await createPlatformThread({
    creatorUserId: user.appUserId,
    threadType,
    productType: (body?.productType || 'shared') as 'shared' | 'app' | 'bracket' | 'legacy',
    title: body?.title ? String(body.title).trim().slice(0, 100) : undefined,
    memberUserIds,
  })

  if (!created) {
    return NextResponse.json({ error: 'Unable to create thread' }, { status: 400 })
  }

  return NextResponse.json({ status: 'ok', thread: created })
}

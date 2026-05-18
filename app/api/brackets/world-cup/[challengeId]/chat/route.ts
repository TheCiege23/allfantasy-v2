import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { userHasBracketBrainAi } from "@/lib/bracket-brain/bracketBrainAccess"
import { prisma } from "@/lib/prisma"
import {
  notifyWorldCupAllMention,
  notifyWorldCupChimmyReply,
  notifyWorldCupMention,
} from "@/lib/world-cup/worldCupNotifications"
import {
  parseWorldCupPoolMentions,
  WORLD_CUP_POOL_CHAT_EVENT_TYPES,
} from "@/lib/world-cup/worldCupPoolChatPlan"
import {
  assertWorldCupChallengeMemberOrManager,
  assertWorldCupManager,
  requireWorldCupApiUser,
  worldCupChallengeParamsSchema,
} from "../../_utils"

export const runtime = "nodejs"

const MAX_BODY_CHARS = 1000

const postSchema = z.object({
  body: z.string().trim().min(1).max(MAX_BODY_CHARS),
})

type RawWorldCupChatEvent = {
  id: string
  challengeId: string
  userId: string | null
  eventType: string
  eventTitle: string
  eventBody: string
  metadata: Record<string, unknown> | null
  createdAt: Date
  isAiGenerated: boolean
  user?: {
    displayName?: string | null
    username?: string | null
    email?: string | null
    avatarUrl?: string | null
  } | null
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function serializeChatMessage(row: RawWorldCupChatEvent, requesterUserId: string) {
  const metadata = metadataObject(row.metadata)
  const visibility = typeof metadata.visibility === "string" ? metadata.visibility : "public"
  const targetUserId = typeof metadata.targetUserId === "string" ? metadata.targetUserId : null
  const displayName =
    row.user?.displayName ||
    row.user?.username ||
    row.user?.email?.split("@")[0] ||
    (row.userId === requesterUserId ? "You" : "Pool member")

  return {
    id: row.id,
    challengeId: row.challengeId,
    userId: row.userId,
    authorName: displayName,
    authorAvatarUrl: row.user?.avatarUrl ?? null,
    body: row.eventBody,
    messageType: metadata.messageType ?? "text",
    visibility,
    targetUserId,
    mentions: Array.isArray(metadata.mentions) ? metadata.mentions : [],
    createdAt: row.createdAt.toISOString(),
    isOwnMessage: row.userId === requesterUserId,
    isPrivate: visibility === "private_to_user",
  }
}

async function listChatMessages(challengeId: string, requesterUserId: string) {
  const rows = await (prisma as any).worldCupBracketChatEvent.findMany({
    where: {
      challengeId,
      eventType: {
        in: [
          WORLD_CUP_POOL_CHAT_EVENT_TYPES.TEXT_MESSAGE,
          WORLD_CUP_POOL_CHAT_EVENT_TYPES.CHIMMY_PRIVATE,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: {
          displayName: true,
          username: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  }) as RawWorldCupChatEvent[]

  return rows
    .filter((row) => {
      const metadata = metadataObject(row.metadata)
      const visibility = metadata.visibility
      const targetUserId = typeof metadata.targetUserId === "string" ? metadata.targetUserId : null
      if (visibility !== "private_to_user") return true
      return row.userId === requesterUserId || targetUserId === requesterUserId
    })
    .reverse()
    .map((row) => serializeChatMessage(row, requesterUserId))
}

async function resolveMentionedUsers(challengeId: string, names: string[]) {
  const normalizedNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)))
  if (normalizedNames.length === 0) return []

  const participants = await (prisma as any).worldCupBracketParticipant.findMany({
    where: {
      challengeId,
      OR: normalizedNames.flatMap((name) => [
        { displayName: { equals: name, mode: "insensitive" } },
        { user: { username: { equals: name, mode: "insensitive" } } },
      ]),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
        },
      },
    },
  }) as Array<{
    userId: string
    displayName: string
    user?: { id: string; username?: string | null; displayName?: string | null; email?: string | null } | null
  }>

  return participants.map((participant) => ({
    userId: participant.userId,
    label: participant.user?.username ?? participant.displayName,
  }))
}

export async function GET(
  request: Request,
  context: { params: { challengeId: string } }
) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const access = await assertWorldCupChallengeMemberOrManager(request, params.data.challengeId, auth.user)
  if (!access.ok) return access.response

  const messages = await listChatMessages(params.data.challengeId, auth.user.id)
  return NextResponse.json({ messages })
}

export async function POST(
  request: Request,
  context: { params: { challengeId: string } }
) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const access = await assertWorldCupChallengeMemberOrManager(request, params.data.challengeId, auth.user)
  if (!access.ok) return access.response

  const json = await request.json().catch(() => ({}))
  const parsed = postSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message", issues: parsed.error.flatten() }, { status: 400 })
  }

  const body = parsed.data.body
  const mentions = parseWorldCupPoolMentions(body)
  const hasGlobal = mentions.some((mention) => mention.type === "global")
  const hasAll = mentions.some((mention) => mention.type === "all")
  const hasChimmy = mentions.some((mention) => mention.type === "chimmy")

  if (hasGlobal) {
    const manager = await assertWorldCupManager(request, params.data.challengeId, auth.user)
    if (!manager.ok) {
      return NextResponse.json({ error: "@global is commissioner-only." }, { status: 403 })
    }
    return NextResponse.json({
      error: "@global World Cup broadcast is coming soon.",
      code: "WORLD_CUP_GLOBAL_BROADCAST_COMING_SOON",
    }, { status: 409 })
  }

  if (hasAll) {
    const manager = await assertWorldCupManager(request, params.data.challengeId, auth.user)
    if (!manager.ok) {
      return NextResponse.json({ error: "@all is commissioner-only for World Cup pools." }, { status: 403 })
    }
  }

  if (hasChimmy) {
    const hasAi = await userHasBracketBrainAi(auth.user.id, auth.user.email ?? null)
    if (!hasAi) {
      return NextResponse.json({
        error: "@chimmy private replies require AI/Pro.",
        code: "WORLD_CUP_CHIMMY_LOCKED",
        private: true,
      }, { status: 402 })
    }
  }

  const usernameMentions = mentions
    .filter((mention) => mention.type === "username")
    .map((mention) => mention.value)
  const resolvedMentions = await resolveMentionedUsers(params.data.challengeId, usernameMentions)

  const visibility = hasChimmy ? "private_to_user" : "public"
  const eventType = hasChimmy
    ? WORLD_CUP_POOL_CHAT_EVENT_TYPES.CHIMMY_PRIVATE
    : WORLD_CUP_POOL_CHAT_EVENT_TYPES.TEXT_MESSAGE

  const created = await (prisma as any).worldCupBracketChatEvent.create({
    data: {
      challengeId: params.data.challengeId,
      userId: auth.user.id,
      eventType,
      eventTitle: hasChimmy ? "Private Chimmy prompt" : "Pool chat",
      eventBody: body,
      idempotencyKey: `chat:${auth.user.id}:${randomUUID()}`,
      isAiGenerated: false,
      metadata: {
        messageType: hasChimmy ? "chimmy_private" : "text",
        visibility,
        targetUserId: hasChimmy ? auth.user.id : null,
        mentions,
        mentionedUserIds: resolvedMentions.map((mention) => mention.userId),
        notificationPreferenceTodo: "respect_world_cup_pool_chat_preferences_before_email_sms_push",
      },
    },
    include: {
      user: {
        select: {
          displayName: true,
          username: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  }) as RawWorldCupChatEvent

  const message = serializeChatMessage(created, auth.user.id)
  if (!hasChimmy && resolvedMentions.length > 0) {
    await notifyWorldCupMention({
      challengeId: params.data.challengeId,
      senderUserId: auth.user.id,
      senderName: message.authorName,
      messageId: created.id,
      body,
      targetUserIds: resolvedMentions.map((mention) => mention.userId),
    })
  }
  if (!hasChimmy && hasAll) {
    await notifyWorldCupAllMention({
      challengeId: params.data.challengeId,
      senderUserId: auth.user.id,
      senderName: message.authorName,
      messageId: created.id,
      body,
    })
  }
  if (hasChimmy) {
    await notifyWorldCupChimmyReply({
      challengeId: params.data.challengeId,
      userId: auth.user.id,
      messageId: created.id,
    })
  }

  return NextResponse.json({ ok: true, message }, { status: 201 })
}

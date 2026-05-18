import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { userHasBracketBrainAi } from "@/lib/bracket-brain/bracketBrainAccess"
import { prisma } from "@/lib/prisma"
import { searchGifs } from "@/lib/rich-message/GIFIntegrationResolver"
import {
  isCloudinaryConfigured,
  isWorldCupChatImageType,
  uploadWorldCupChatImageToCloudinary,
  WORLD_CUP_CHAT_IMAGE_MAX_BYTES,
} from "@/lib/world-cup/worldCupChatImageUpload"
import {
  getWorldCupNotificationPreferenceResolution,
  updateWorldCupNotificationPreferencesForUser,
} from "@/lib/world-cup/worldCupNotificationPreferences"
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
const ALLOWED_GIF_PROVIDERS = ["klipy", "tenor", "giphy"] as const

const preferencePatchSchema = z.object({
  poolMuted: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  usernameMentionsEnabled: z.boolean().optional(),
  allMentionsEnabled: z.boolean().optional(),
  commissionerAnnouncementsEnabled: z.boolean().optional(),
  deadlineRemindersEnabled: z.boolean().optional(),
  bracketFinalizedEnabled: z.boolean().optional(),
  resultsUpdatedEnabled: z.boolean().optional(),
  leaderboardUpdatedEnabled: z.boolean().optional(),
  generalChatEnabled: z.boolean().optional(),
  chimmyRepliesEnabled: z.boolean().optional(),
  globalBroadcastEnabled: z.boolean().optional(),
})

const postSchema = z.object({
  action: z.literal("send_message").optional(),
  body: z.string().trim().min(1).max(MAX_BODY_CHARS),
  gif: z.object({
    id: z.string().trim().min(1).max(120),
    title: z.string().trim().max(160).optional().default("GIF"),
    previewUrl: z.string().url().max(1000),
    gifUrl: z.string().url().max(1000),
    width: z.number().int().min(0).max(4000).optional().default(0),
    height: z.number().int().min(0).max(4000).optional().default(0),
    provider: z.enum(ALLOWED_GIF_PROVIDERS),
  }).optional(),
  image: z.object({
    assetId: z.string().trim().min(1).max(160),
    publicId: z.string().trim().min(1).max(300),
    secureUrl: z.string().url().max(1000),
    width: z.number().int().min(0).max(8000).optional().default(0),
    height: z.number().int().min(0).max(8000).optional().default(0),
    format: z.string().trim().min(1).max(24),
    bytes: z.number().int().min(1).max(5 * 1024 * 1024),
    provider: z.literal("cloudinary"),
  }).optional(),
})

const postActionSchema = z.object({
  action: z.string().trim().optional(),
}).passthrough()

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

type UploadedImageFile = Blob & { name?: string; arrayBuffer: () => Promise<ArrayBuffer> }

function isUploadedImageFile(value: unknown): value is UploadedImageFile {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
      typeof (value as { size?: unknown }).size === "number"
  )
}

function inferImageMimeType(file: UploadedImageFile) {
  const declared = file.type || ""
  if (declared && declared !== "application/octet-stream") return declared
  const name = typeof (file as File).name === "string" ? (file as File).name.toLowerCase() : ""
  if (name.endsWith(".png")) return "image/png"
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg"
  if (name.endsWith(".webp")) return "image/webp"
  if (name.endsWith(".gif")) return "image/gif"
  return declared || "application/octet-stream"
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function isAllowedGifUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return false
    const host = url.hostname.toLowerCase()
    return host.includes("klipy") ||
      host.includes("giphy") ||
      host.includes("tenor") ||
      host.includes("gstatic") ||
      host.includes("media")
  } catch {
    return false
  }
}

function gifMetadata(value: unknown) {
  const metadata = metadataObject(value)
  const provider = typeof metadata.provider === "string" ? metadata.provider : null
  const gifUrl = typeof metadata.gifUrl === "string" ? metadata.gifUrl : null
  const previewUrl = typeof metadata.previewUrl === "string" ? metadata.previewUrl : null
  if (!provider || !gifUrl || !previewUrl) return null
  return {
    id: typeof metadata.id === "string" ? metadata.id : "gif",
    title: typeof metadata.title === "string" ? metadata.title : "GIF",
    previewUrl,
    gifUrl,
    width: typeof metadata.width === "number" ? metadata.width : 0,
    height: typeof metadata.height === "number" ? metadata.height : 0,
    provider,
  }
}

function imageMetadata(value: unknown) {
  const metadata = metadataObject(value)
  const provider = metadata.provider === "cloudinary" ? "cloudinary" : null
  const secureUrl = typeof metadata.secureUrl === "string" ? metadata.secureUrl : null
  const publicId = typeof metadata.publicId === "string" ? metadata.publicId : null
  if (!provider || !secureUrl || !publicId) return null
  return {
    assetId: typeof metadata.assetId === "string" ? metadata.assetId : "",
    publicId,
    secureUrl,
    width: typeof metadata.width === "number" ? metadata.width : 0,
    height: typeof metadata.height === "number" ? metadata.height : 0,
    format: typeof metadata.format === "string" ? metadata.format : "",
    bytes: typeof metadata.bytes === "number" ? metadata.bytes : 0,
    provider,
  }
}

function isAllowedCloudinaryImageUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && /(^|\.)res\.cloudinary\.com$/i.test(url.hostname)
  } catch {
    return false
  }
}

function sanitizeGifQuery(value: string | null) {
  return (value ?? "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 64)
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
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
    gif: gifMetadata(metadata.gif),
    image: imageMetadata(metadata.image),
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

async function searchWorldCupChatGifs(request: Request) {
  const url = new URL(request.url)
  const q = sanitizeGifQuery(url.searchParams.get("q"))
  if (!q) {
    return NextResponse.json({ gifs: [], total: 0 })
  }

  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 12), 1), 24)
  const results = await searchGifs(q, limit)
  const gifs = results.map((gif) => ({
    id: gif.id,
    title: "GIF",
    previewUrl: gif.previewUrl ?? gif.url,
    gifUrl: gif.url,
    width: safeNumber((gif as { width?: unknown }).width),
    height: safeNumber((gif as { height?: unknown }).height),
    provider: gif.provider,
  }))

  return NextResponse.json({ gifs, total: gifs.length })
}

async function getNotificationPreferences(userId: string, challengeId: string) {
  const resolution = await getWorldCupNotificationPreferenceResolution(userId, challengeId)
  return NextResponse.json({
    preferences: resolution.preferences,
    phoneVerified: resolution.phoneVerified,
    phoneVerificationRequiredForSms: true,
  })
}

async function updateNotificationPreferences(
  userId: string,
  challengeId: string,
  patch: unknown
) {
  const parsed = preferencePatchSchema.safeParse(patch)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences", issues: parsed.error.flatten() }, { status: 400 })
  }

  const result = await updateWorldCupNotificationPreferencesForUser({
    userId,
    challengeId,
    patch: parsed.data,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to save preferences" }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    preferences: result.preferences,
    phoneVerificationRequiredForSms: true,
  })
}

async function uploadWorldCupImage(request: Request, challengeId: string, userId: string) {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json({
      error: "Cloudinary image uploads are not configured.",
      code: "WORLD_CUP_CLOUDINARY_NOT_CONFIGURED",
      requiredEnv: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
    }, { status: 501 })
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!isUploadedImageFile(file)) {
    return NextResponse.json({ error: "Image file required" }, { status: 400 })
  }

  const mimeType = inferImageMimeType(file)
  if (!isWorldCupChatImageType(mimeType)) {
    return NextResponse.json({ error: "Only PNG, JPEG, WebP, and GIF images are allowed" }, { status: 400 })
  }

  const actualBytes = (await file.arrayBuffer()).byteLength
  if (file.size > WORLD_CUP_CHAT_IMAGE_MAX_BYTES || actualBytes > WORLD_CUP_CHAT_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 })
  }

  try {
    const image = await uploadWorldCupChatImageToCloudinary({
      file,
      challengeId,
      userId,
    })
    return NextResponse.json({ image })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Image upload failed",
    }, { status: 500 })
  }
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

  const url = new URL(request.url)
  const action = url.searchParams.get("action")
  if (action === "gifs") {
    return searchWorldCupChatGifs(request)
  }
  if (action === "notification_preferences") {
    return getNotificationPreferences(auth.user.id, params.data.challengeId)
  }

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

  const url = new URL(request.url)
  const queryAction = url.searchParams.get("action")
  if (queryAction === "upload_image") {
    return uploadWorldCupImage(request, params.data.challengeId, auth.user.id)
  }

  if (queryAction && queryAction !== "update_notification_preferences" && queryAction !== "send_message") {
    if (queryAction === "create_poll" || queryAction === "poll_vote") {
      return NextResponse.json({
        error: "World Cup chat polls are not available yet.",
        code: "WORLD_CUP_CHAT_POLLS_COMING_SOON",
      }, { status: 501 })
    }
    return NextResponse.json({ error: "Unknown World Cup chat action" }, { status: 400 })
  }

  const json = await request.json().catch(() => ({}))
  const action = queryAction ?? postActionSchema.parse(json).action
  if (action === "update_notification_preferences") {
    return updateNotificationPreferences(auth.user.id, params.data.challengeId, json)
  }
  if (action === "create_poll" || action === "poll_vote") {
    return NextResponse.json({
      error: "World Cup chat polls are not available yet.",
      code: "WORLD_CUP_CHAT_POLLS_COMING_SOON",
    }, { status: 501 })
  }
  if (action && action !== "send_message") {
    return NextResponse.json({ error: "Unknown World Cup chat action" }, { status: 400 })
  }

  const parsed = postSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message", issues: parsed.error.flatten() }, { status: 400 })
  }

  const body = parsed.data.body
  const gif = parsed.data.gif
  const image = parsed.data.image
  if (gif && (!isAllowedGifUrl(gif.previewUrl) || !isAllowedGifUrl(gif.gifUrl))) {
    return NextResponse.json({ error: "Invalid GIF provider URL" }, { status: 400 })
  }
  if (image && !isAllowedCloudinaryImageUrl(image.secureUrl)) {
    return NextResponse.json({ error: "Invalid Cloudinary image URL" }, { status: 400 })
  }
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
        messageType: image ? "image" : gif ? "gif" : hasChimmy ? "chimmy_private" : "text",
        gif: gif ? {
          id: gif.id,
          title: gif.title,
          previewUrl: gif.previewUrl,
          gifUrl: gif.gifUrl,
          width: gif.width,
          height: gif.height,
          provider: gif.provider,
        } : null,
        image: image ? {
          assetId: image.assetId,
          publicId: image.publicId,
          secureUrl: image.secureUrl,
          width: image.width,
          height: image.height,
          format: image.format,
          bytes: image.bytes,
          provider: image.provider,
        } : null,
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

import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { userHasBracketBrainAi } from "@/lib/bracket-brain/bracketBrainAccess"
import { prisma } from "@/lib/prisma"
import {
  buildWorldCupAiPoolRecapLines,
  generateAiWrappedLines,
  getWorldCupCommissionerBrainSnapshot,
  type WorldCupAiRecapTone,
} from "@/lib/world-cup/worldCupCommissionerBrainService"
import { WORLD_CUP_BRACKET_EVENT_TYPES } from "@/lib/world-cup/worldCupBracketEvents"
import {
  emitWorldCupBracketChatEvent,
  getWorldCupCommissionerSettings,
} from "@/lib/world-cup/worldCupBracketEventService"
import { isWorldCupBracketBrainEnabledForChallenge } from "@/lib/world-cup/worldCupBracketSettingsService"
import {
  assertWorldCupManager,
  requireWorldCupApiUser,
  worldCupChallengeParamsSchema,
} from "../../_utils"

export const runtime = "nodejs"

const postSchema = z.object({
  action: z.enum([
    "hype",
    "standings",
    "watch",
    "recap",
    "preview_recap",
    "post_recap",
    "drama_recap",
    "path",
    "reminder",
  ]),
  round: z.string().optional(),
  entryId: z.string().optional(),
  tone: z.enum(["fun", "serious", "hype"]).optional().default("fun"),
  lines: z.array(z.string().trim().min(1).max(500)).max(12).optional(),
})

export async function GET(
  request: Request,
  context: { params: { challengeId: string } }
) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const access = await assertWorldCupManager(
    request,
    params.data.challengeId,
    auth.user
  )
  if (!access.ok) return access.response

  const [snapshot, settings, hasAi, challengeRow] = await Promise.all([
    getWorldCupCommissionerBrainSnapshot(params.data.challengeId),
    getWorldCupCommissionerSettings(params.data.challengeId),
    userHasBracketBrainAi(auth.user.id, auth.user.email ?? null),
    prisma.worldCupBracketChallenge.findUnique({
      where: { id: params.data.challengeId },
      select: { sourcePayload: true },
    }),
  ])

  return NextResponse.json({
    snapshot,
    settings,
    hasBracketBrainAi: hasAi,
    bracketBrainEnabled: isWorldCupBracketBrainEnabledForChallenge(challengeRow?.sourcePayload),
  })
}

export async function POST(
  request: Request,
  context: { params: { challengeId: string } }
) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const access = await assertWorldCupManager(
    request,
    params.data.challengeId,
    auth.user
  )
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const hasAi = await userHasBracketBrainAi(auth.user.id, auth.user.email ?? null)
  if (!hasAi && parsed.data.action === "drama_recap") {
    const lines = await buildWorldCupAiPoolRecapLines(params.data.challengeId, parsed.data.tone as WorldCupAiRecapTone)
    return NextResponse.json({
      ok: true,
      action: parsed.data.action,
      lines: lines.slice(0, 3),
      posted: false,
      source: "deterministic",
      proLocked: true,
    })
  }

  if (!hasAi) {
    return NextResponse.json(
      {
        error: "AF Pro required for Bracket Brain AI output.",
        upgrade: true,
        hasBracketBrainAi: false,
      },
      { status: 402 }
    )
  }

  const challengeRow = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: params.data.challengeId },
    select: { sourcePayload: true },
  })
  if (!isWorldCupBracketBrainEnabledForChallenge(challengeRow?.sourcePayload)) {
    return NextResponse.json(
      {
        error: "Bracket Brain is disabled in league settings.",
        bracketBrainDisabled: true,
      },
      { status: 403 }
    )
  }

  const isRecapPreview = parsed.data.action === "preview_recap"
  const isRecapPost = parsed.data.action === "post_recap"
  const isDramaRecap = parsed.data.action === "drama_recap"
  const wrappedAction = parsed.data.action as
    | "hype"
    | "standings"
    | "watch"
    | "recap"
    | "path"
    | "reminder"
  const lines = isRecapPost && parsed.data.lines?.length
    ? parsed.data.lines
    : isRecapPreview || isRecapPost || isDramaRecap
      ? await buildWorldCupAiPoolRecapLines(params.data.challengeId, parsed.data.tone as WorldCupAiRecapTone)
      : await generateAiWrappedLines(wrappedAction, params.data.challengeId, {
          round: parsed.data.round as any,
          entryId: parsed.data.entryId,
        })

  if (isRecapPreview) {
    return NextResponse.json({
      lines,
      action: parsed.data.action,
      posted: false,
      source: "deterministic_finalized_public",
    })
  }

  const titleByAction: Record<string, string> = {
    hype: "Bracket hype",
    standings: "Standings snapshot",
    watch: "What to watch",
    recap: "Round recap",
    preview_recap: "AI pool recap preview",
    post_recap: "AI pool recap",
    drama_recap: "Pool Drama Report",
    path: "Path to win",
    reminder: "Reminder",
  }

  const bodyText = lines.join("\n").slice(0, 4000)
  await emitWorldCupBracketChatEvent({
    challengeId: params.data.challengeId,
    eventType: WORLD_CUP_BRACKET_EVENT_TYPES.COMMISSIONER_BRAIN_MESSAGE,
    eventTitle: titleByAction[parsed.data.action] ?? "Commissioner update",
    eventBody: bodyText,
    idempotencyKey: randomUUID(),
    userId: auth.user.id,
    isAiGenerated: true,
    metadata: {
      action: parsed.data.action,
      visibility: "public",
      messageType: isRecapPost ? "ai_recap" : "commissioner_brain",
      source: isRecapPost || isDramaRecap ? "deterministic_finalized_public" : undefined,
    },
    force: true,
  })

  return NextResponse.json({
    ok: true,
    lines,
    action: parsed.data.action,
    posted: true,
    source: isDramaRecap ? "deterministic" : undefined,
  })
}

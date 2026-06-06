import "server-only"

import { appendChatHistory, buildChimmyConversationId } from "@/lib/ai-memory/chat-history-store"
import { routeTextCall } from "@/lib/ai/providerRouter"
import type { WorldCupChimmyContext } from "./worldCupChimmyContext"
import {
  buildWorldCupChimmySystemPrompt,
  enforceWorldCupChimmyReplyGuard,
  reliableDataUnavailableMessage,
  serializeChimmyContext,
  tryDeterministicWorldCupChimmyReply,
} from "./worldCupChimmyReplyPolicy"
import {
  buildWorldCupChimmyGrounding,
  serializeWorldCupChimmyGrounding,
  type WorldCupChimmyUserRole,
} from "./worldCupChimmyGroundingService"

const MAX_REPLY_CHARS = 2000

function sanitizeChimmyText(value: string) {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stripChimmyMention(value: string) {
  return sanitizeChimmyText(value.replace(/(^|[\s*_~\]])@chimmy\b/gi, "$1"))
}

export async function generateWorldCupChimmyPrivateReply(input: {
  userId: string
  challengeId: string
  prompt: string
  challengeName?: string | null
  locale?: string | null
  context?: WorldCupChimmyContext | null
  userRole?: WorldCupChimmyUserRole | null
  deterministicOnly?: boolean
}) {
  const userPrompt = stripChimmyMention(input.prompt)
  const conversationId = buildChimmyConversationId({
    userId: input.userId,
    explicitConversationId: `chimmy:${input.userId}:world-cup:${input.challengeId}`,
  })

  await appendChatHistory({
    conversationId,
    role: "user",
    content: userPrompt || input.prompt,
    userId: input.userId,
    leagueId: null,
    meta: {
      source: "world_cup_pool_chat",
      challengeId: input.challengeId,
      surface: "world_cup_pool_chat",
    },
  })

  const deterministic = tryDeterministicWorldCupChimmyReply({
    prompt: userPrompt || input.prompt,
    context: input.context,
    locale: input.locale,
  })
  const grounding = buildWorldCupChimmyGrounding({
    prompt: userPrompt || input.prompt,
    context: input.context,
    userRole: input.userRole,
  })

  let provider: string = "deterministic"
  let model: string = "policy"
  let reply: string

  if (deterministic) {
    reply = deterministic
  } else if (input.deterministicOnly) {
    reply = "I can answer saved pool questions here, but deeper Chimmy AI analysis requires AF Pro. Ask me who is leading, explain the scoring, summarize this pool, or show your path to win and I will use only stored pool data."
  } else if (!input.context || grounding.dataQuality.confidence === "none") {
    provider = "unavailable"
    model = "policy"
    reply = [
      reliableDataUnavailableMessage(input.locale),
      "Missing data: World Cup pool grounding context.",
      "No tokens should be charged for this unavailable answer.",
    ].join(" ")
  } else if (grounding.dataQuality.noChargeReason && grounding.prompt.intent.access.tokenPolicy === "blocked_no_charge") {
    provider = "unavailable"
    model = "policy"
    reply = [
      reliableDataUnavailableMessage(input.locale),
      grounding.dataQuality.noChargeReason,
      "No tokens should be charged for this unavailable answer.",
    ].join(" ")
  } else {
    const system = buildWorldCupChimmySystemPrompt(input.locale)
    const contextBlock = input.context ? serializeChimmyContext(input.context) : null
    const groundingBlock = serializeWorldCupChimmyGrounding(grounding)
    const challengeLine = input.challengeName
      ? `Pool: ${input.challengeName}.`
      : "Pool: World Cup bracket challenge."

    const userContent = [
      challengeLine,
      `\n--- GROUNDING JSON ---\n${groundingBlock}\n--- END GROUNDING JSON ---`,
      contextBlock ? `\n--- POOL DATA ---\n${contextBlock}\n--- END POOL DATA ---` : "",
      `\nUser private prompt: ${userPrompt || input.prompt}`,
    ]
      .filter(Boolean)
      .join("")

    const result = await routeTextCall({
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      profile: "cheap",
      temperature: 0.45,
      maxTokens: 520,
      skipCache: true,
    })

    provider = result.ok ? result.provider : "unavailable"
    model = result.ok ? result.model : "unavailable"
    reply = result.ok
      ? sanitizeChimmyText(result.text).slice(0, MAX_REPLY_CHARS)
      : "I could not reach Chimmy AI right now. Your prompt stayed private, and you can try again in a moment."
  }

  reply = enforceWorldCupChimmyReplyGuard({
    reply,
    prompt: userPrompt || input.prompt,
    context: input.context,
    locale: input.locale,
  }).slice(0, MAX_REPLY_CHARS)

  await appendChatHistory({
    conversationId,
    role: "assistant",
    content: reply,
    userId: input.userId,
    leagueId: null,
    meta: {
      source: "world_cup_pool_chat",
      challengeId: input.challengeId,
      surface: "world_cup_pool_chat",
      provider,
      model,
      groundingIntent: grounding.prompt.intent.category,
      groundingConfidence: grounding.dataQuality.confidence,
      noChargeReason: grounding.dataQuality.noChargeReason,
    },
  })

  return {
    reply,
    conversationId,
    provider,
    model,
    grounding,
  }
}

import "server-only"

import { appendChatHistory, buildChimmyConversationId } from "@/lib/ai-memory/chat-history-store"
import { DETERMINISTIC_SOURCE, tryDeterministicAnswer } from "@/lib/ai/deterministic"
import { routeTextCall } from "@/lib/ai/providerRouter"
import {
  buildWcChimmyGroundingPacket,
  serializeChimmyGroundingPacket,
} from "@/lib/ai/chimmyGroundingPacket"
import type { WorldCupChimmyContext } from "./worldCupChimmyContext"
import {
  buildWorldCupChimmySystemPrompt,
  enforceWorldCupChimmyReplyGuard,
  reliableDataUnavailableMessage,
  tryDeterministicWorldCupChimmyReply,
} from "./worldCupChimmyReplyPolicy"
import {
  buildWorldCupChimmyGrounding,
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

function isGlobalWorldCupStartQuestion(value: string) {
  return /\bwhen\s+(does|is|do).*\bworld\s*cup\b.*\b(start|begin|kick\s*off)|\bworld\s*cup\b.*\b(start|begin|kick\s*off)\b/i.test(value)
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
  entitlements?: {
    plan?: "free" | "pro" | "commissioner" | "supreme" | "war_room"
    tokenBalance?: number
  }
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

  const prompt = userPrompt || input.prompt
  const earlyGlobalDeterministic = isGlobalWorldCupStartQuestion(prompt)
    ? await tryDeterministicAnswer(prompt, input.locale ?? undefined)
    : null
  const worldCupDeterministic = earlyGlobalDeterministic
    ? null
    : tryDeterministicWorldCupChimmyReply({
        prompt,
        context: input.context,
        locale: input.locale,
      })
  const generalDeterministic = worldCupDeterministic || earlyGlobalDeterministic
    ? null
    : await tryDeterministicAnswer(prompt, input.locale ?? undefined)
  const deterministic = earlyGlobalDeterministic ?? worldCupDeterministic ?? generalDeterministic
  const isGeneralDeterministicReply = Boolean(earlyGlobalDeterministic || generalDeterministic)
  const grounding = buildWorldCupChimmyGrounding({
    prompt,
    context: input.context,
    userRole: input.userRole,
  })

  let provider: string = "deterministic"
  let model: string = "policy"
  let reply: string

  if (deterministic) {
    provider = isGeneralDeterministicReply ? DETERMINISTIC_SOURCE : "deterministic"
    model = isGeneralDeterministicReply ? "sports-cache" : "policy"
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

    // Build the unified grounding packet — the ONLY data payload the LLM sees.
    // It consolidates pool context, bracket state, sports data, allowed claims,
    // and missing data into one structured object enforced by the system prompt.
    const packet = buildWcChimmyGroundingPacket({
      userQuestion: prompt,
      context: input.context,
      grounding,
      entitlements: input.entitlements,
    })

    const userContent = [
      `--- GROUNDING PACKET ---\n${serializeChimmyGroundingPacket(packet)}\n--- END GROUNDING PACKET ---`,
      `\nUser question: ${prompt}`,
    ].join("")

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

  reply = (isGeneralDeterministicReply
    ? reply
    : enforceWorldCupChimmyReplyGuard({
        reply,
        prompt,
        context: input.context,
        locale: input.locale,
      })
  ).slice(0, MAX_REPLY_CHARS)

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

import "server-only"

import { appendChatHistory, buildChimmyConversationId } from "@/lib/ai-memory/chat-history-store"
import { routeTextCall } from "@/lib/ai/providerRouter"
import type { WorldCupChimmyContext } from "./worldCupChimmyContext"
import {
  buildWorldCupChimmySystemPrompt,
  enforceWorldCupChimmyReplyGuard,
  serializeChimmyContext,
  tryDeterministicWorldCupChimmyReply,
} from "./worldCupChimmyReplyPolicy"

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

  let provider: string = "deterministic"
  let model: string = "policy"
  let reply: string

  if (deterministic) {
    reply = deterministic
  } else {
    const system = buildWorldCupChimmySystemPrompt(input.locale)
    const contextBlock = input.context ? serializeChimmyContext(input.context) : null
    const challengeLine = input.challengeName
      ? `Pool: ${input.challengeName}.`
      : "Pool: World Cup bracket challenge."

    const userContent = [
      challengeLine,
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
    },
  })

  return {
    reply,
    conversationId,
    provider,
    model,
  }
}

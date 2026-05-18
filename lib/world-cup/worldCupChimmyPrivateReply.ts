import "server-only"

import { appendChatHistory, buildChimmyConversationId } from "@/lib/ai-memory/chat-history-store"
import { openaiChatText } from "@/lib/openai-client"

const MAX_REPLY_CHARS = 1200

function sanitizeChimmyText(value: string) {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
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

  const system = [
    "You are Chimmy, the private AllFantasy World Cup bracket assistant.",
    "Answer only for the requesting user. Do not mention or infer private data from other pool members.",
    "Focus on World Cup pool, bracket, pick, scenario, and strategy questions.",
    "Do not make gambling, legal, financial, sportsbook, or guaranteed-outcome claims.",
    "If exact pool context is not provided, say so briefly and give general bracket guidance.",
    "Keep the tone calm, direct, and useful. Use 2-4 short paragraphs or bullets.",
  ].join(" ")

  const challengeLine = input.challengeName ? `Pool: ${input.challengeName}.` : "Pool: World Cup bracket challenge."
  const result = await openaiChatText({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `${challengeLine}\nUser private prompt: ${userPrompt || input.prompt}`,
      },
    ],
    temperature: 0.45,
    maxTokens: 420,
    skipCache: true,
  })

  const reply = result.ok
    ? sanitizeChimmyText(result.text).slice(0, MAX_REPLY_CHARS)
    : "I could not reach Chimmy AI right now. Your prompt stayed private, and you can try again in a moment."

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
      provider: result.ok ? "openai" : "unavailable",
      model: result.model,
    },
  })

  return {
    reply,
    conversationId,
    provider: result.ok ? "openai" : "unavailable",
    model: result.model,
  }
}

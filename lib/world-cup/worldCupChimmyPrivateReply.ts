import "server-only"

import { appendChatHistory, buildChimmyConversationId } from "@/lib/ai-memory/chat-history-store"
import { DETERMINISTIC_SOURCE, tryDeterministicAnswer } from "@/lib/ai/deterministic"
import { routeTextCall } from "@/lib/ai/providerRouter"
import {
  buildWcChimmyGroundingPacket,
  serializeChimmyGroundingPacket,
} from "@/lib/ai/chimmyGroundingPacket"
import {
  buildFreshnessLabel,
  buildMissingDataList,
  type AIGroundingContract,
  type FreshnessLabel,
} from "@/lib/ai/aiGroundingContract"
import { validateAIResponse, buildFallbackResponse as buildContractFallback } from "@/lib/ai/responseValidator"
import { logAiInteraction, type AiValidatorResult } from "@/lib/ai/auditLogger"
import type { UserRole } from "@/lib/ai/engine/types"
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

// ─── Minimal validation contract builder ──────────────────────────────────────
// The private-reply path uses the old grounding packet system (not the WC plugin
// full pipeline), so we build just enough of the AIGroundingContract to give the
// responseValidator the fields it actually checks:
//   liveScores=null  → score_invention rule fires if AI invents a score
//   oddsData=null    → odds_without_data rule fires if AI references a favorite
//   plan             → plan_gate_violation rule fires for free users

function buildMinimalChimmyContract(opts: {
  challengeId: string
  context: WorldCupChimmyContext | null | undefined
  plan: string
  userRole: WorldCupChimmyUserRole | null | undefined
  locale: string | null | undefined
}): AIGroundingContract {
  const freshness = buildFreshnessLabel("pool_only", null)
  const poolName = opts.context?.poolName ?? "World Cup Pool"
  const totalEntries =
    (opts.context?.entryCount ?? opts.context?.participantCount) ?? 0
  const missingData = buildMissingDataList({
    liveScores: null,
    oddsData: null,
    providerFixtures: null,
    scoringContext: null,
    userPicks: null,
    leaderboard: null,
  })
  return {
    contractVersion: "af-contract-v1",
    sport: "world_cup",
    feature: "pool_chat",
    userRole: (opts.userRole ?? "user") as UserRole,
    plan: opts.plan,
    locale: opts.locale ?? null,
    sourceFreshness: freshness,
    poolContext: {
      poolId: opts.challengeId,
      poolName,
      totalEntries,
      sport: "world_cup",
      format: "bracket",
      currentPhase: "active",
      prizePool: null,
    },
    scoringContext: null,
    userPicks: null,
    leaderboard: null,
    providerFixtures: null,
    /** null = AI MUST NOT state any score */
    liveScores: null,
    /** null = AI MUST NOT reference any favorite or spread */
    oddsData: null,
    computedInsights: {},
    missingData,
    allowedClaims: ["AllFantasy pool data, pick distribution, and entry scores"],
    forbiddenClaims: [
      "any live match score or current result — live feed not loaded",
      "team favorite status or any odds/spread — no odds data loaded",
    ],
  }
}

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
  let validatorResult: AiValidatorResult | null = null
  let blockedReason: string | null = null
  let tokensUsed: number | null = null

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

    if (result.ok) {
      // Sanitize raw text, then run through the contract validator.
      // The minimal contract sets liveScores=null and oddsData=null,
      // which catches score invention and odds overclaims before they reach users.
      const rawText = sanitizeChimmyText(result.text).slice(0, MAX_REPLY_CHARS)
      const contract = buildMinimalChimmyContract({
        challengeId: input.challengeId,
        context: input.context,
        plan: input.entitlements?.plan ?? "free",
        userRole: input.userRole,
        locale: input.locale,
      })
      const validation = validateAIResponse(rawText, contract)
      if (validation.blockedByRule) {
        reply = buildContractFallback(contract, validation.blockedByRule)
        validatorResult = "blocked"
        blockedReason = validation.blockedByRule
      } else {
        reply = validation.sanitized
        validatorResult = validation.failures.length > 0 ? "warned" : "clean"
      }
      tokensUsed = result.tokensUsed ?? null
    } else {
      reply = "I could not reach Chimmy AI right now. Your prompt stayed private, and you can try again in a moment."
      validatorResult = "unavailable"
    }
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

  // sourceFreshness — this path always uses pool-only data (no live sports feed)
  const sourceFreshness: FreshnessLabel = buildFreshnessLabel("pool_only", null)

  // Audit log — fire and forget, must never throw or delay the response
  logAiInteraction({
    userId: input.userId,
    sport: "world_cup",
    feature: "pool_chat",
    route: "/api/brackets/world-cup/[challengeId]/chat",
    plan: input.entitlements?.plan ?? null,
    providerSource: provider,
    freshnessTier: "pool_only",
    promptIntent: grounding.prompt.intent.category,
    missingData: ["live match scores", "odds and favorites data"],
    allowedClaims: ["AllFantasy pool data"],
    validatorResult: deterministic ? "deterministic" : validatorResult,
    blockedReason,
    modelUsed: model,
    tokenCost: tokensUsed,
    wasDeterministic: Boolean(deterministic),
  })

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
      validatorResult,
      blockedReason,
    },
  })

  return {
    reply,
    conversationId,
    provider,
    model,
    grounding,
    sourceFreshness,
  }
}

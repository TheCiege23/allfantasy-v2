import "server-only"

import { appendChatHistory, buildChimmyConversationId } from "@/lib/ai-memory/chat-history-store"
import { DETERMINISTIC_SOURCE, tryDeterministicAnswer } from "@/lib/ai/deterministic"
import { routeTextCall } from "@/lib/ai/providerRouter"
import {
  buildWcChimmyGroundingPacket,
  serializeChimmyGroundingPacket,
} from "@/lib/ai/chimmyGroundingPacket"
import {
  buildAllowedClaims,
  buildForbiddenClaims,
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
  serializeWorldCupChimmyGrounding,
  type WorldCupChimmyUserRole,
} from "./worldCupChimmyGroundingService"
import {
  hashGroundingPacket,
  getOrCreateWcChimmyInsight,
} from "@/lib/ai/aiInsightCache"

const MAX_REPLY_CHARS = 2000

// ─── Minimal validation contract builder ──────────────────────────────────────
// The private-reply path sends ChimmyGroundingPacket to the model, then uses this
// v1 contract for shared validation. Scores/fixtures/picks are loaded when the
// World Cup context has them; odds remain null so favorites/spreads stay blocked.

function toFreshnessDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function validatorRole(role: WorldCupChimmyUserRole | null | undefined): UserRole {
  if (role === "commissioner") return "commissioner"
  if (role === "admin") return "admin"
  if (role === "non_member") return "guest"
  return "owner"
}

function pickResult(value: boolean | null): "correct" | "incorrect" | "pending" {
  if (value === true) return "correct"
  if (value === false) return "incorrect"
  return "pending"
}

function buildValidatorFixtures(
  context: WorldCupChimmyContext | null | undefined
): AIGroundingContract["providerFixtures"] {
  if (!context) return null
  const live = context.liveMatches.map((match) => ({
    matchId: match.matchId,
    homeTeam: match.homeTeamName,
    awayTeam: match.awayTeamName,
    kickoffUtc: match.startsAt,
    round: match.round,
    venue: [match.venueName, match.venueCity].filter(Boolean).join(", ") || null,
    status: "live" as const,
  }))
  const upcoming = context.upcomingMatches.map((match) => ({
    matchId: match.matchId,
    homeTeam: match.homeTeamName,
    awayTeam: match.awayTeamName,
    kickoffUtc: match.startsAt,
    round: match.round,
    venue: [match.venueName, match.venueCity].filter(Boolean).join(", ") || null,
    status: "scheduled" as const,
  }))
  const recent = context.recentMatches.map((match) => ({
    matchId: match.matchId,
    homeTeam: match.homeTeamName,
    awayTeam: match.awayTeamName,
    kickoffUtc: match.startsAt,
    round: match.round,
    venue: [match.venueName, match.venueCity].filter(Boolean).join(", ") || null,
    status: "final" as const,
  }))
  const fixtures = [...live, ...upcoming, ...recent]
  return fixtures.length ? fixtures : null
}

function buildValidatorScoreRows(
  context: WorldCupChimmyContext | null | undefined
): AIGroundingContract["liveScores"] {
  if (!context) return null
  const rows = [...context.liveMatches, ...context.recentMatches]
    .filter((match) => typeof match.homeScore === "number" && typeof match.awayScore === "number")
    .map((match) => ({
      matchId: match.matchId,
      homeTeam: match.homeTeamName,
      awayTeam: match.awayTeamName,
      homeScore: match.homeScore as number,
      awayScore: match.awayScore as number,
      minute: match.minute,
      extraTime: Boolean(match.injuryTime),
      // responseValidator only checks null vs loaded. The exact score-token
      // guard later still verifies every score against live/recent matches.
      status: "live" as const,
    }))
  return rows.length ? rows : null
}

function buildValidatorScoring(
  context: WorldCupChimmyContext | null | undefined
): AIGroundingContract["scoringContext"] {
  if (!context?.scoring) return null
  return {
    description: "World Cup bracket pool scoring",
    pointsByRound: {
      roundOf32: context.scoring.roundOf32Points,
      roundOf16: context.scoring.roundOf16Points,
      quarterFinal: context.scoring.quarterFinalPoints,
      semiFinal: context.scoring.semiFinalPoints,
      final: context.scoring.finalPoints,
      thirdPlace: context.scoring.thirdPlacePoints,
    },
    bonusRules: [`Champion bonus: ${context.scoring.championBonusPoints} points`],
    championMultiplier: null,
  }
}

function buildValidatorPicks(
  context: WorldCupChimmyContext | null | undefined
): AIGroundingContract["userPicks"] {
  const entry = context?.entry
  if (!entry) return null
  const groupPicks = entry.groupPicks.map((pick) => ({
    matchId: `group:${pick.groupKey}:${pick.rank}`,
    matchDescription: `${pick.groupName} rank ${pick.rank}`,
    pickedTeam: pick.teamName,
    phase: "group_stage",
    pointsAtStake: pick.pointsAwarded,
    result: pickResult(pick.isCorrect),
  }))
  const knockoutPicks = entry.knockoutPicks.map((pick, index) => ({
    matchId: `knockout:${pick.round}:${index}`,
    matchDescription: `${pick.homeTeamName} vs ${pick.awayTeamName}`,
    pickedTeam: pick.pickedTeam,
    phase: pick.round,
    pointsAtStake: pick.pointsAwarded,
    result: pickResult(pick.isCorrect),
  }))
  const picks = [...groupPicks, ...knockoutPicks]
  return picks.length ? picks : null
}

function buildValidatorLeaderboard(
  context: WorldCupChimmyContext | null | undefined,
  userId: string
): AIGroundingContract["leaderboard"] {
  if (!context?.leaderboard.length) return null
  return context.leaderboard.map((row) => ({
    rank: row.rank,
    displayName: row.entryName,
    score: row.totalScore,
    maxPossible: row.maxPossibleScore,
    isCurrentUser: row.userId === userId,
    isTied: context.leaderboard.some((other) => other.entryId !== row.entryId && other.rank === row.rank),
  }))
}

function buildMinimalChimmyContract(opts: {
  challengeId: string
  context: WorldCupChimmyContext | null | undefined
  plan: string
  userRole: WorldCupChimmyUserRole | null | undefined
  locale: string | null | undefined
  userId: string
}): AIGroundingContract {
  const providerFixtures = buildValidatorFixtures(opts.context)
  const liveScores = buildValidatorScoreRows(opts.context)
  const scoringContext = buildValidatorScoring(opts.context)
  const userPicks = buildValidatorPicks(opts.context)
  const leaderboard = buildValidatorLeaderboard(opts.context, opts.userId)
  const freshnessTier =
    opts.context?.liveDataStatus === "live" && liveScores
      ? "live"
      : liveScores
        ? "cached"
        : providerFixtures
          ? "schedule_only"
          : "pool_only"
  const freshness = buildFreshnessLabel(freshnessTier, toFreshnessDate(opts.context?.lastSyncedAt))
  const poolName = opts.context?.poolName ?? "World Cup Pool"
  const totalEntries =
    (opts.context?.entryCount ?? opts.context?.participantCount) ?? 0
  const missingData = buildMissingDataList({
    liveScores,
    oddsData: null,
    providerFixtures,
    scoringContext,
    userPicks,
    leaderboard,
  })
  const computedInsights = {
    participantCount: opts.context?.participantCount ?? 0,
    entryCount: opts.context?.entryCount ?? null,
    finalizedEntryCount: opts.context?.finalizedEntryCount ?? null,
    userScore: opts.context?.entry?.totalScore ?? null,
    userMaxPossibleScore: opts.context?.entry?.maxPossibleScore ?? null,
    userRank: opts.context?.entry?.rank ?? null,
  }
  const claimParts = {
    liveScores,
    oddsData: null,
    providerFixtures,
    scoringContext,
    userPicks,
    leaderboard,
    computedInsights,
  }
  return {
    contractVersion: "af-contract-v1",
    sport: "world_cup",
    feature: "pool_chat",
    userRole: validatorRole(opts.userRole),
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
    scoringContext,
    userPicks,
    leaderboard,
    providerFixtures,
    /** null = AI MUST NOT state any score */
    liveScores,
    /** null = AI MUST NOT reference any favorite or spread */
    oddsData: null,
    computedInsights,
    missingData,
    allowedClaims: buildAllowedClaims(claimParts),
    forbiddenClaims: buildForbiddenClaims({ liveScores, oddsData: null, plan: opts.plan }),
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
    // ── LLM path — check AiInsightCache first ─────────────────────────────────
    //
    // Cache key: userId × challengeId × normalizedPrompt × groundingHash.
    // Same user, same pool state, same question → cache hit within TTL.
    // Pool data changes (new match, leaderboard update) → groundingHash changes
    // → cache miss → fresh LLM call + validation.
    //
    // The onCacheMiss closure MUST still validate the response — cached answers
    // are post-validation text saved by the first call.
    const groundingHash = hashGroundingPacket({
      participantCount: input.context?.participantCount ?? 0,
      entryCount: input.context?.entryCount ?? null,
      finalizedEntryCount: input.context?.finalizedEntryCount ?? null,
      userRank: input.context?.entry?.rank ?? null,
      userScore: input.context?.entry?.totalScore ?? null,
      isLocked: input.context?.isLocked ?? false,
      liveDataStatus: input.context?.liveDataStatus ?? "unavailable",
      lastSyncedAt: input.context?.lastSyncedAt ?? null,
      leaderTop3: (input.context?.leaderboard ?? [])
        .slice(0, 3)
        .map((r) => ({ id: r.entryId, score: r.totalScore })),
    })

    const cacheResult = await getOrCreateWcChimmyInsight(
      {
        userId: input.userId,
        challengeId: input.challengeId,
        promptNormalized: prompt.toLowerCase().trim().slice(0, 400),
        groundingHash,
      },
      async () => {
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
          `\n--- GROUNDING JSON ---\n${serializeWorldCupChimmyGrounding(grounding)}\n--- END GROUNDING JSON ---`,
          `\nUser question: ${prompt}`,
        ].join("")

        const llmResult = await routeTextCall({
          messages: [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
          profile: "cheap",
          temperature: 0.45,
          maxTokens: 520,
          skipCache: true,
        })

        if (!llmResult.ok) {
          return { resultText: null, provider: "unavailable", model: "unavailable" }
        }

        // Sanitize raw text, then run through the contract validator.
        // The minimal contract sets liveScores and oddsData to the appropriate
        // values, which catches score invention and odds overclaims before they
        // reach users. The validated text is what gets cached.
        const rawText = sanitizeChimmyText(llmResult.text).slice(0, MAX_REPLY_CHARS)
        const contract = buildMinimalChimmyContract({
          challengeId: input.challengeId,
          context: input.context,
          plan: input.entitlements?.plan ?? "free",
          userRole: input.userRole,
          locale: input.locale,
          userId: input.userId,
        })
        const validation = validateAIResponse(rawText, contract)
        const finalText = validation.blockedByRule
          ? buildContractFallback(contract, validation.blockedByRule)
          : validation.sanitized

        // Surface validation outcome so the audit log can record it
        validatorResult = validation.blockedByRule
          ? "blocked"
          : validation.failures.length > 0
            ? "warned"
            : "clean"
        blockedReason = validation.blockedByRule ?? null

        return {
          resultText: finalText,
          tokensUsed: llmResult.tokensUsed ?? null,
          provider: llmResult.provider,
          model: llmResult.model,
          status: validation.blockedByRule ? "blocked" : "ready",
        }
      }
    )

    if (cacheResult.cacheHit) {
      // Served from cache — no LLM call was made
      reply = cacheResult.text || "I could not reach Chimmy AI right now. Your prompt stayed private, and you can try again in a moment."
      provider = "cache"
      model = "cache"
      validatorResult = "clean" // cached text was already validated
    } else if (!cacheResult.text) {
      // LLM was unavailable
      reply = "I could not reach Chimmy AI right now. Your prompt stayed private, and you can try again in a moment."
      provider = cacheResult.provider ?? "unavailable"
      model = cacheResult.model ?? "unavailable"
      validatorResult = validatorResult ?? "unavailable"
    } else {
      reply = cacheResult.text
      provider = cacheResult.provider ?? "unavailable"
      model = cacheResult.model ?? "unavailable"
      tokensUsed = cacheResult.tokensUsed
      // validatorResult already set inside onCacheMiss
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

  // Build the same validation contract for telemetry and the UI freshness chip.
  const auditContract = buildMinimalChimmyContract({
    challengeId: input.challengeId,
    context: input.context,
    plan: input.entitlements?.plan ?? "free",
    userRole: input.userRole,
    locale: input.locale,
    userId: input.userId,
  })
  const sourceFreshness: FreshnessLabel = auditContract.sourceFreshness

  // Audit log — fire and forget, must never throw or delay the response
  logAiInteraction({
    userId: input.userId,
    sport: "world_cup",
    feature: "pool_chat",
    route: "/api/brackets/world-cup/[challengeId]/chat",
    plan: input.entitlements?.plan ?? null,
    providerSource: provider,
    freshnessTier: sourceFreshness.tier,
    promptIntent: grounding.prompt.intent.category,
    missingData: auditContract.missingData,
    allowedClaims: auditContract.allowedClaims,
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

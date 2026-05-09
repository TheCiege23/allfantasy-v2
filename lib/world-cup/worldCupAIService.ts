/**
 * Server-side World Cup matchup intelligence: deterministic core + optional OpenAI narratives.
 */
import { prisma } from "@/lib/prisma"
import { openaiChatText } from "@/lib/openai-client"
import type {
  WorldCupAiStrategy,
  WorldCupMatchupIntelligence,
  WorldCupMatchView,
} from "./types"
import {
  estimateWorldCupWinProbability,
  getWorldCupPickRecommendation,
  getWorldCupUpsetRisk,
} from "./worldCupAiInsights"
import {
  buildRankingSeedComparison,
  describeBracketImpactIfTeamWins,
  getProbabilityBasedPickSides,
  getRecentFormPlaceholder,
} from "./worldCupPickStrategy"

export type MatchupIntelligenceIntent = "panel" | "ask_ai" | "explain"

export type BuildWorldCupMatchupIntelligenceArgs = {
  match: WorldCupMatchView
  strategy?: WorldCupAiStrategy
  intent?: MatchupIntelligenceIntent
  /**
   * When false/omitted, skips all OpenAI paths (AF Pro / Bracket Brain).
   * Must be true only when the caller verified Bracket Brain AI entitlement.
   */
  bracketBrainAiEntitled?: boolean
}

function deterministicNarratives(params: {
  match: WorldCupMatchView
  strategy: WorldCupAiStrategy
  recommendedTeamName: string
  upsetRisk: "low" | "medium" | "high"
  homePct: number
  awayPct: number
  bracketImpactRecommended: string
}): Pick<
  WorldCupMatchupIntelligence,
  "whyThisPickMakesSense" | "howRiskyIsThisPick" | "whatThisMeansForYourBracket"
> {
  const { recommendedTeamName, upsetRisk, homePct, awayPct, bracketImpactRecommended, strategy } =
    params
  const whyThisPickMakesSense =
    `${recommendedTeamName} fits a ${strategy} read with the model split (${homePct}% / ${awayPct}%). ` +
    `Use “Pick Safe” or “Pick Upset” if you want the probability favorite or contrarian side without locking it in yet.`

  const howRiskyIsThisPick =
    upsetRisk === "high"
      ? "Volatility is elevated — either side can believably win. Differentiation upside comes with real bust risk."
      : upsetRisk === "medium"
        ? "Moderate volatility: lean with the model but expect some bracket variance."
        : "Lower volatility — the favorite is the clearer bracket stabilizer."

  const whatThisMeansForYourBracket =
    `${bracketImpactRecommended} Nothing is saved until you tap “Use This Pick.”`

  return { whyThisPickMakesSense, howRiskyIsThisPick, whatThisMeansForYourBracket }
}

async function maybeLogAiInteraction(payload: {
  userId: string
  challengeId: string
  entryId: string
  matchId: string
  intent: MatchupIntelligenceIntent
  generative: boolean
}) {
  try {
    const p = prisma as unknown as { aiLog?: { create: (args: unknown) => Promise<unknown> } }
    if (!p.aiLog?.create) return
    await p.aiLog.create({
      data: {
        userId: payload.userId,
        scope: "world_cup_matchup",
        metadata: {
          challengeId: payload.challengeId,
          entryId: payload.entryId,
          matchId: payload.matchId,
          intent: payload.intent,
          generative: payload.generative,
        },
      },
    })
  } catch {
    // Table missing or schema mismatch — skip quietly
  }
}

async function tryGenerativeNarratives(params: {
  match: WorldCupMatchView
  intent: MatchupIntelligenceIntent
  strategy: WorldCupAiStrategy
  homeName: string
  awayName: string
  homePct: number
  awayPct: number
  upsetRisk: "low" | "medium" | "high"
  keyFactors: string[]
  recommendedTeamName: string
  bracketImpactRecommended: string
  openaiConfigured: boolean
}): Promise<
  | {
      whyThisPickMakesSense: string
      howRiskyIsThisPick: string
      whatThisMeansForYourBracket: string
      generative: true
    }
  | null
> {
  if (!params.openaiConfigured || !params.match.homeTeamId || !params.match.awayTeamId) {
    return null
  }

  const focus =
    params.intent === "explain"
      ? "Explain the matchup mechanics for a bracket picker (no betting)."
      : "Give actionable bracket guidance."

  const system = `You are a concise World Cup bracket assistant. ${focus} Respond with exactly three short paragraphs labeled:
WHY:
RISK:
BRACKET:
Each paragraph max 2 sentences. Plain text only.`

  const userMsg =
    `${params.homeName} vs ${params.awayName}. Win model: ${params.homeName} ${params.homePct}%, ${params.awayName} ${params.awayPct}%. ` +
    `Upset risk: ${params.upsetRisk}. Strategy: ${params.strategy}. Recommended lean: ${params.recommendedTeamName}. ` +
    `Factors: ${params.keyFactors.join("; ")}.`

  const res = await openaiChatText({
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ],
    temperature: params.intent === "explain" ? 0.35 : 0.45,
    maxTokens: 320,
    skipCache: true,
  })

  if (!res.ok || res.text.trim().length < 40) return null

  const text = res.text.trim()
  const whyMatch = text.match(/WHY:\s*([\s\S]*?)(?=RISK:|$)/i)
  const riskMatch = text.match(/RISK:\s*([\s\S]*?)(?=BRACKET:|$)/i)
  const bracketMatch = text.match(/BRACKET:\s*([\s\S]*?)$/i)

  if (!whyMatch || !riskMatch || !bracketMatch) return null

  return {
    whyThisPickMakesSense: whyMatch[1].trim(),
    howRiskyIsThisPick: riskMatch[1].trim(),
    whatThisMeansForYourBracket: bracketMatch[1].trim(),
    generative: true,
  }
}

/**
 * Builds matchup intelligence for API routes and tests.
 */
export async function buildWorldCupMatchupIntelligence(
  args: BuildWorldCupMatchupIntelligenceArgs & {
    logContext?: {
      userId: string
      challengeId: string
      entryId: string
    }
  }
): Promise<WorldCupMatchupIntelligence> {
  const strategy = args.strategy ?? "balanced"
  const intent: MatchupIntelligenceIntent = args.intent ?? "panel"
  const match = args.match
  const bracketBrainAiEntitled = args.bracketBrainAiEntitled === true

  const winProb = estimateWorldCupWinProbability(match)
  const upsetRisk = getWorldCupUpsetRisk(match)
  const rec = getWorldCupPickRecommendation(match, strategy)
  const sides = getProbabilityBasedPickSides(
    match,
    winProb.homeWinProbability,
    winProb.awayWinProbability
  )

  const homePct = Math.round(winProb.homeWinProbability * 100)
  const awayPct = Math.round(winProb.awayWinProbability * 100)
  const homeName = match.homeTeamName || match.homeSlotKey
  const awayName = match.awayTeamName || match.awaySlotKey

  const deterministicSummary =
    `${rec.recommendedTeamName} recommended (${strategy}). ${homeName} ${homePct}% vs ${awayName} ${awayPct}%. Upset risk: ${upsetRisk}. ${rec.explanation}`

  const bracketImpactRecommended =
    describeBracketImpactIfTeamWins(match, rec.recommendedSide ?? sides.safePickSide)

  let narratives = deterministicNarratives({
    match,
    strategy,
    recommendedTeamName: rec.recommendedTeamName,
    upsetRisk,
    homePct,
    awayPct,
    bracketImpactRecommended,
  })
  let narrativesGenerative = false

  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY)
  const allowLlm =
    bracketBrainAiEntitled &&
    openaiConfigured &&
    (intent === "ask_ai" || intent === "explain")

  if (allowLlm) {
    const gen = await tryGenerativeNarratives({
      match,
      intent,
      strategy,
      homeName,
      awayName,
      homePct,
      awayPct,
      upsetRisk,
      keyFactors: winProb.explanationFactors,
      recommendedTeamName: rec.recommendedTeamName,
      bracketImpactRecommended,
      openaiConfigured,
    })
    if (gen) {
      narratives = {
        whyThisPickMakesSense: gen.whyThisPickMakesSense,
        howRiskyIsThisPick: gen.howRiskyIsThisPick,
        whatThisMeansForYourBracket: gen.whatThisMeansForYourBracket,
      }
      narrativesGenerative = gen.generative
    }
  }

  let summary = deterministicSummary
  let summaryGenerative = false
  if (
    intent === "panel" &&
    bracketBrainAiEntitled &&
    openaiConfigured &&
    match.homeTeamId &&
    match.awayTeamId
  ) {
    const venue = match.venueName
      ? ` at ${match.venueName}${match.venueCity ? `, ${match.venueCity}` : ""}`
      : ""
    try {
      const aiResult = await openaiChatText({
        messages: [
          {
            role: "system",
            content:
              "You are a World Cup bracket strategy assistant. Give a concise 2-sentence matchup preview. No caveats about live data.",
          },
          {
            role: "user",
            content:
              `Match: ${homeName} vs ${awayName}${venue}.\n` +
              `Win probability: ${homeName} ${homePct}%, ${awayName} ${awayPct}%.\n` +
              `Upset risk: ${upsetRisk}. Strategy: ${strategy}.\n` +
              `Key factors: ${winProb.explanationFactors.join("; ")}.\n` +
              `End with the recommended pick: "${rec.recommendedTeamName}".`,
          },
        ],
        temperature: 0.4,
        maxTokens: 150,
        skipCache: false,
      })
      if (aiResult.ok && aiResult.text.trim().length > 20) {
        summary = aiResult.text.trim()
        summaryGenerative = true
      }
    } catch {
      // keep deterministic summary
    }
  }

  const intel: WorldCupMatchupIntelligence = {
    matchId: match.id,
    recommendedTeamId: rec.recommendedTeamId,
    recommendedTeamName: rec.recommendedTeamName,
    recommendedSide: rec.recommendedSide,
    homeWinProbability: winProb.homeWinProbability,
    awayWinProbability: winProb.awayWinProbability,
    confidence: winProb.confidence,
    upsetRisk,
    keyFactors: winProb.explanationFactors,
    summary,
    safePick: sides.safePickTeamName,
    contrarianPick: sides.upsetPickTeamName,
    projectedScore: null,
    generative: summaryGenerative,
    safePickSide: sides.safePickSide,
    upsetPickSide: sides.upsetPickSide,
    safePickTeamName: sides.safePickTeamName,
    upsetPickTeamName: sides.upsetPickTeamName,
    riskLevel: upsetRisk,
    recentFormSummary: getRecentFormPlaceholder(),
    rankingSeedComparison: buildRankingSeedComparison(match),
    bracketImpactIfHomeWins: describeBracketImpactIfTeamWins(match, "home"),
    bracketImpactIfAwayWins: describeBracketImpactIfTeamWins(match, "away"),
    whyThisPickMakesSense: narratives.whyThisPickMakesSense,
    howRiskyIsThisPick: narratives.howRiskyIsThisPick,
    whatThisMeansForYourBracket: narratives.whatThisMeansForYourBracket,
    narrativesGenerative,
  }

  if (args.logContext) {
    await maybeLogAiInteraction({
      userId: args.logContext.userId,
      challengeId: args.logContext.challengeId,
      entryId: args.logContext.entryId,
      matchId: match.id,
      intent,
      generative: narrativesGenerative || summaryGenerative,
    })
  }

  return intel
}

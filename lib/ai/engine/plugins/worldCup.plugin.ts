/**
 * World Cup Sport Plugin — First full implementation of the AllFantasy AI Engine.
 *
 * All deterministic calculations (leaderboard, pick concentration, swing analysis,
 * chaos ratings) run in computeInsights via existing WC service functions.
 * AI only receives the pre-computed packet and writes a 1-2 sentence narrative.
 *
 * Bridges:
 * - lib/world-cup/worldCupScoringService    → computeInsights
 * - lib/world-cup/worldCupInsightCards      → computeInsights (card data)
 * - lib/ai/chimmyGroundingPacket            → buildGroundingPacket
 * - lib/world-cup/worldCupChimmyReplyPolicy → buildSystemPrompt
 */
import "server-only"
import { prisma } from "@/lib/prisma"
import { buildWorldCupLeaderboardRows } from "@/lib/world-cup/worldCupScoringService"
import {
  buildPoolSwingAlertCard,
  buildChampionPickRiskCard,
  buildRootingGuideCard,
  buildCommissionerRecapCard,
} from "@/lib/world-cup/worldCupInsightCards"
import { buildWorldCupChimmySystemPrompt } from "@/lib/world-cup/worldCupChimmyReplyPolicy"
import { getAiLanguageInstruction } from "@/lib/world-cup/worldCupI18n"
import type { SportPlugin, AIEngineInput } from "../types"

// ─── Context type — what we fetch from the DB ─────────────────────────────────

export type WcContext = {
  challengeId: string
  challengeName: string
  totalEntries: number
  isLocked: boolean
  scoringProfile: {
    roundOf32Points?: number | null
    roundOf16Points?: number | null
    quarterFinalPoints?: number | null
    semiFinalPoints?: number | null
    finalPoints?: number | null
    championBonus?: number | null
  } | null
  leaderboardRows: ReturnType<typeof buildWorldCupLeaderboardRows>
  mostPopularChampion: { teamName: string; count: number } | null
}

// ─── Provider data — live scores, fixtures from external feed ─────────────────

export type WcProviderData = {
  liveFixtures: Array<{
    id: number
    homeTeam: string
    awayTeam: string
    homeScore: number | null
    awayScore: number | null
    status: string
    elapsed: number | null
  }>
  lastSyncedAt: string
}

// ─── Insights — ALL deterministic calculations ────────────────────────────────

export type WcInsights = {
  leaderboardSummary: {
    leader: { entryName: string; displayName: string; score: number } | null
    totalEntries: number
    averageScore: number
    scoreSpread: number // leader score - last place score
  }
  poolSwingCard: Awaited<ReturnType<typeof buildPoolSwingAlertCard>>
  championRiskCard: Awaited<ReturnType<typeof buildChampionPickRiskCard>>
  rootingGuideCard: Awaited<ReturnType<typeof buildRootingGuideCard>>
  commissionerRecapCard: Awaited<ReturnType<typeof buildCommissionerRecapCard>>
  incompleteBrackets: number
  topThreeEntries: Array<{ rank: number; entryName: string; displayName: string; score: number }>
}

// ─── Plugin implementation ────────────────────────────────────────────────────

export const worldCupPlugin: SportPlugin<WcContext, WcProviderData, WcInsights> = {
  sport: "world_cup",
  version: "1.0.0",
  features: [
    "pool_chat",
    "private_ai",
    "commissioner_insights",
    "bracket_recommendation",
    "rooting_guide",
    "pool_swing",
    "champion_risk",
    "recap",
    "at_risk",
    "trash_talk",
    "social_invite",
    "tomorrow_hype",
    "hype",
  ],

  // ── Step 1: Fetch DB context ─────────────────────────────────────────────────
  async fetchContext(input: AIEngineInput): Promise<WcContext> {
    const challenge = await prisma.worldCupBracketChallenge.findUnique({
      where: { id: input.contextId },
      include: {
        matches: true,
        scoringProfile: true,
        entries: {
          where: { isComplete: true, submittedAt: { not: null } },
          include: {
            picks: {
              select: {
                id: true,
                matchId: true,
                round: true,
                selectedTeamName: true,
                pointsAwarded: true,
                isCorrect: true,
              },
            },
            participant: { select: { displayName: true } },
          },
        },
      },
    })

    if (!challenge) {
      return {
        challengeId: input.contextId,
        challengeName: "Unknown Pool",
        totalEntries: 0,
        isLocked: false,
        scoringProfile: null,
        leaderboardRows: [],
        mostPopularChampion: null,
      }
    }

    const rows = buildWorldCupLeaderboardRows({
      entries: challenge.entries as any,
      matches: challenge.matches as any,
      scoring: challenge.scoringProfile,
    })

    // Champion pick tally
    const champCounts = new Map<string, number>()
    for (const entry of challenge.entries as Array<{ championTeamName?: string | null; picks?: Array<{ round: string; selectedTeamName?: string | null }> }>) {
      const champ =
        entry.championTeamName?.trim() ||
        entry.picks?.find((p) => p.round === "final")?.selectedTeamName?.trim()
      if (champ) champCounts.set(champ, (champCounts.get(champ) ?? 0) + 1)
    }
    const topChamp = [...champCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null

    return {
      challengeId: challenge.id,
      challengeName: challenge.name,
      totalEntries: challenge.entries.length,
      isLocked: Boolean(challenge.pickLockAt && new Date(challenge.pickLockAt) < new Date()),
      scoringProfile: challenge.scoringProfile,
      leaderboardRows: rows,
      mostPopularChampion: topChamp ? { teamName: topChamp[0], count: topChamp[1] } : null,
    }
  },

  // ── Step 2: Fetch provider data (live scores / fixtures) ─────────────────────
  async fetchProviderData(_context, _input) {
    // World Cup live data comes from the existing worldCupLiveDataService.
    // For now the engine defers to pool_only freshness so existing WC API routes
    // continue to work. This can be wired to the live data feed when ready.
    //
    // TODO: import { getWorldCupLiveDataForChallenge } from "@/lib/world-cup/worldCupLiveDataService"
    // const live = await getWorldCupLiveDataForChallenge(input.contextId)
    // if (live) return { data: live, freshness: "live", fetchedAt: new Date() }
    return null
  },

  // ── Step 3: Compute deterministic insights ────────────────────────────────────
  async computeInsights(context, _providerData, input): Promise<WcInsights> {
    const rows = context.leaderboardRows
    const sorted = [...rows].sort((a, b) => a.rank - b.rank || b.totalScore - a.totalScore)

    const scores = sorted.map((r) => r.totalScore)
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : 0
    const spread = (scores[0] ?? 0) - (scores[scores.length - 1] ?? 0)

    // Run card builders in parallel — all deterministic, no AI
    const [poolSwingCard, championRiskCard, rootingGuideCard, commissionerRecapCard] =
      await Promise.all([
        buildPoolSwingAlertCard(input.contextId),
        buildChampionPickRiskCard(input.contextId, input.entryId),
        buildRootingGuideCard(input.contextId, input.entryId),
        buildCommissionerRecapCard(input.contextId),
      ])

    return {
      leaderboardSummary: {
        leader: sorted[0]
          ? { entryName: sorted[0].entryName, displayName: sorted[0].displayName, score: sorted[0].totalScore }
          : null,
        totalEntries: sorted.length,
        averageScore: avgScore,
        scoreSpread: Math.max(0, spread),
      },
      poolSwingCard,
      championRiskCard,
      rootingGuideCard,
      commissionerRecapCard,
      incompleteBrackets: 0, // populated by commissioner snapshot if needed
      topThreeEntries: sorted.slice(0, 3).map((r) => ({
        rank: r.rank,
        entryName: r.entryName,
        displayName: r.displayName,
        score: r.totalScore,
      })),
    }
  },

  // ── Step 4: Build grounding packet ───────────────────────────────────────────
  buildGroundingPacket(context, _providerData, insights, input): Record<string, unknown> {
    const { leaderboardSummary, topThreeEntries, poolSwingCard, championRiskCard, rootingGuideCard } = insights

    return {
      contractVersion: "af-engine-wc-v1",
      sport: "world_cup",
      feature: input.feature,
      userRole: input.userRole,
      entitlements: input.entitlements,
      poolContext: {
        poolId: context.challengeId,
        poolName: context.challengeName,
        totalEntries: context.totalEntries,
        isLocked: context.isLocked,
        leaderboardSummary,
        topThreeEntries,
        mostPopularChampion: context.mostPopularChampion,
        scoringRules: context.scoringProfile ?? {},
      },
      // Include the pre-computed insight cards (numbers are facts, AI cannot change them)
      insights: {
        poolSwing: poolSwingCard
          ? {
              match: `${poolSwingCard.homeTeam} vs ${poolSwingCard.awayTeam}`,
              round: poolSwingCard.roundLabel,
              favoredTeam: poolSwingCard.favoredTeam,
              favoredCount: poolSwingCard.favoredCount,
              underdogTeam: poolSwingCard.underdogTeam,
              underdogCount: poolSwingCard.underdogCount,
              maxPointsAtRisk: poolSwingCard.maxPointsAtRisk,
              chaosRating: poolSwingCard.chaosRating,
            }
          : null,
        championRisk: championRiskCard
          ? {
              topChampion: championRiskCard.topChampion,
              poolPickPercent: championRiskCard.poolPickPercent,
              differentiation: championRiskCard.differentiation,
              alternatives: championRiskCard.alternativeLeverage,
            }
          : null,
        rootingGuide: rootingGuideCard
          ? {
              entryName: rootingGuideCard.entryName,
              rootFor: rootingGuideCard.rootFor,
              threatTeam: rootingGuideCard.threatTeam,
              pointsAtRisk: rootingGuideCard.pointsAtRisk,
              usersAboveWithThreat: rootingGuideCard.usersAboveWithThreat,
            }
          : null,
      },
      allowedClaims: [
        "pool standings and leaderboard data from AllFantasy",
        "champion pick distribution from submitted brackets",
        "upcoming match swing analysis based on pool picks",
        "scoring rules from the pool's configuration",
        ...(insights.poolSwingCard ? ["upcoming match pick split data"] : []),
        ...(insights.rootingGuideCard ? ["rooting guide for the target entry"] : []),
      ],
      missingData: [
        ...(_providerData ? [] : ["live match scores and events"]),
      ],
    }
  },

  // ── Step 5: System prompt ────────────────────────────────────────────────────
  buildSystemPrompt(input: AIEngineInput): string {
    // Delegate to existing WC Chimmy policy so voice is consistent
    return buildWorldCupChimmySystemPrompt(input.locale)
  },

  // ── Step 6: Validate response ─────────────────────────────────────────────────
  validateResponse(response: string): string {
    // Strip any invented soccer facts (scores, minutes) the AI might have slipped in
    const hasInventedScore = /\b\d{1,2}[-–]\d{1,2}\b/.test(response)
    if (hasInventedScore) {
      // Replace the entire response with a safe fallback prompt
      // (in practice the grounding contract prevents this, but defense-in-depth)
      return response.replace(/\b\d{1,2}[-–]\d{1,2}\b/g, "[score not available]")
    }
    return response
  },
}

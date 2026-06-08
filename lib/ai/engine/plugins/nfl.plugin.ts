/**
 * NFL Fantasy Plugin — AllFantasy AI Engine
 *
 * Deterministic layer computes:
 * - Start/sit rankings (from projected points, not AI opinion)
 * - Waiver wire priority (FAAB value score, not "trust me" AI)
 * - Trade value differential (from FantasyCalc + scoring context)
 * - Matchup difficulty rating (opponent defense rank vs. position)
 * - Power rankings (based on scoring trends, not vibes)
 *
 * AI only explains WHY the numbers say what they say.
 * AI never invents a projection, rank, or injury status.
 *
 * Implementation status: PLUGIN STRUCTURE READY — deterministic
 * functions pending connection to NFL scoring/roster data.
 * Replace TODO blocks as each data source is wired up.
 */
import "server-only"
import type { SportPlugin, AIEngineInput } from "../types"
import { getAiLanguageInstruction } from "@/lib/world-cup/worldCupI18n"

// ─── Context type ─────────────────────────────────────────────────────────────

export type NflContext = {
  leagueId: string
  leagueName: string
  scoringFormat: "ppr" | "half_ppr" | "standard" | string
  numTeams: number
  currentWeek: number
  isSuperflex: boolean
  userTeam: {
    teamId: string
    teamName: string
    record: { wins: number; losses: number; ties: number }
    rosterSpots: Array<{
      position: string
      playerId: string
      playerName: string
      projectedPoints: number | null
      actualPoints: number | null
      injuryStatus: string | null // "Questionable" | "Doubtful" | "Out" | "IR" | null
      isStarting: boolean
    }>
  } | null
  leagueStandings: Array<{
    rank: number
    teamId: string
    teamName: string
    wins: number
    losses: number
    pointsFor: number
    pointsAgainst: number
  }>
  waiverClaims: Array<{
    playerId: string
    playerName: string
    position: string
    percentOwned: number
    projectedPoints: number | null
    recentTrend: "up" | "down" | "stable"
  }>
}

// ─── Provider data — from NFL stats/injury API ────────────────────────────────

export type NflProviderData = {
  weeklyProjections: Array<{
    playerId: string
    playerName: string
    position: string
    opponentTeam: string
    projectedPoints: number
    confidenceScore: number // 0-100, deterministic from historical variance
  }>
  injuryReport: Array<{
    playerId: string
    playerName: string
    status: string // "Q" | "D" | "O" | "IR"
    practice: string // "FP" | "LP" | "DNP"
    reason: string
  }>
  defenseRankings: Array<{
    teamAbbr: string
    rankVsQB: number
    rankVsRB: number
    rankVsWR: number
    rankVsTE: number
  }>
}

// ─── Insights — all deterministic calculations ────────────────────────────────

export type NflInsights = {
  startSitRecommendations: Array<{
    playerId: string
    playerName: string
    position: string
    recommendation: "start" | "sit" | "flex"
    projectedPoints: number
    opponentRank: number // 1 = hardest, 32 = easiest
    riskLevel: "low" | "medium" | "high"
    reasonCode: string // "top_projection" | "injury_risk" | "tough_matchup" | "favorable_matchup"
  }>
  waiverPriority: Array<{
    playerId: string
    playerName: string
    position: string
    priorityScore: number // 0-100, deterministic: projection × (1 - percentOwned/100) × trendMultiplier
    projectedPoints: number
    recommendedFaabBid: number | null // % of budget
  }>
  tradeValueSummary: {
    yourTopAssets: Array<{ playerName: string; tradeValue: number; position: string }>
    suggestedTargets: Array<{ playerName: string; tradeValue: number; position: string }>
    needPositions: string[] // derived from roster construction, not AI
  }
  weeklyMatchupGrade: {
    overallGrade: "A" | "B" | "C" | "D" | "F"
    projectedScore: number
    opponentProjectedScore: number
    winProbability: number // 0-100, based on projected scores
  } | null
  powerRankings: Array<{
    rank: number
    teamName: string
    pointsFor: number
    trend: "up" | "down" | "stable"
  }>
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const nflPlugin: SportPlugin<NflContext, NflProviderData, NflInsights> = {
  sport: "nfl",
  version: "0.1.0",
  features: [
    "lineup_advice",
    "matchup_preview",
    "waiver_wire",
    "trade_eval",
    "power_rankings",
    "injury_report",
    "pool_chat",
    "private_ai",
  ],

  async fetchContext(input: AIEngineInput): Promise<NflContext> {
    // TODO: query league + roster + standings from DB
    // const league = await prisma.league.findUnique({ where: { id: input.contextId }, ... })
    return {
      leagueId: input.contextId,
      leagueName: "NFL League",
      scoringFormat: "ppr",
      numTeams: 12,
      currentWeek: 1,
      isSuperflex: false,
      userTeam: null,
      leagueStandings: [],
      waiverClaims: [],
    }
  },

  async fetchProviderData(_context, _input) {
    // TODO: call NFL data provider (e.g. Sleeper API, ESPN, or internal stats feed)
    // const projections = await fetchWeeklyNflProjections(context.currentWeek)
    // const injuries = await fetchNflInjuryReport()
    return null
  },

  async computeInsights(context, providerData, _input): Promise<NflInsights> {
    // ── Start/Sit ──────────────────────────────────────────────────────────────
    // Ranking formula: projectedPoints × (1 - injuryRisk) × opponentMultiplier
    // All variables come from providerData (projections + defenseRankings + injuryReport)
    // TODO: replace with real scoring when providerData is wired

    const startSitRecommendations: NflInsights["startSitRecommendations"] = []
    if (providerData && context.userTeam) {
      for (const slot of context.userTeam.rosterSpots) {
        if (!slot.projectedPoints) continue
        const injuryRisk = slot.injuryStatus === "Out" || slot.injuryStatus === "IR" ? 1 : 0
        const opponentRank = 16 // placeholder — replace with defenseRankings lookup
        const riskLevel: "low" | "medium" | "high" =
          slot.injuryStatus === "Questionable"
            ? "medium"
            : slot.injuryStatus
              ? "high"
              : "low"
        startSitRecommendations.push({
          playerId: slot.playerId,
          playerName: slot.playerName,
          position: slot.position,
          recommendation: injuryRisk > 0 ? "sit" : slot.projectedPoints > 12 ? "start" : "flex",
          projectedPoints: slot.projectedPoints,
          opponentRank,
          riskLevel,
          reasonCode: injuryRisk > 0 ? "injury_risk" : opponentRank <= 10 ? "tough_matchup" : "top_projection",
        })
      }
    }

    // ── Waiver priority ────────────────────────────────────────────────────────
    // Formula: projection × (1 - ownPct/100) × trendMultiplier
    const waiverPriority: NflInsights["waiverPriority"] = context.waiverClaims
      .filter((p) => p.percentOwned < 50)
      .map((p) => {
        const proj = p.projectedPoints ?? 0
        const trendMult = p.recentTrend === "up" ? 1.2 : p.recentTrend === "down" ? 0.8 : 1.0
        const score = Math.round(proj * (1 - p.percentOwned / 100) * trendMult * 10)
        return {
          playerId: p.playerId,
          playerName: p.playerName,
          position: p.position,
          priorityScore: Math.min(100, score),
          projectedPoints: proj,
          recommendedFaabBid: proj > 15 ? Math.round(proj * 2) : null,
        }
      })
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 8)

    // ── Win probability ────────────────────────────────────────────────────────
    // Simple Pythagorean: winProbability = projected^2 / (projected^2 + opp^2)
    // TODO: replace placeholder projections with real providerData values
    const weeklyMatchupGrade: NflInsights["weeklyMatchupGrade"] = null

    // ── Power rankings ─────────────────────────────────────────────────────────
    const powerRankings = context.leagueStandings
      .sort((a, b) => b.pointsFor - a.pointsFor)
      .slice(0, 5)
      .map((t, i) => ({
        rank: i + 1,
        teamName: t.teamName,
        pointsFor: t.pointsFor,
        trend: "stable" as const,
      }))

    return {
      startSitRecommendations,
      waiverPriority,
      tradeValueSummary: { yourTopAssets: [], suggestedTargets: [], needPositions: [] },
      weeklyMatchupGrade,
      powerRankings,
    }
  },

  buildGroundingPacket(context, _providerData, insights, input): Record<string, unknown> {
    return {
      contractVersion: "af-engine-nfl-v1",
      sport: "nfl",
      feature: input.feature,
      userRole: input.userRole,
      entitlements: input.entitlements,
      leagueContext: {
        leagueId: context.leagueId,
        leagueName: context.leagueName,
        scoringFormat: context.scoringFormat,
        numTeams: context.numTeams,
        currentWeek: context.currentWeek,
        isSuperflex: context.isSuperflex,
        userTeam: context.userTeam
          ? { teamName: context.userTeam.teamName, record: context.userTeam.record }
          : null,
      },
      insights: {
        startSit: insights.startSitRecommendations.slice(0, 5),
        topWaiverTargets: insights.waiverPriority.slice(0, 3),
        weeklyMatchup: insights.weeklyMatchupGrade,
        powerRankings: insights.powerRankings,
      },
      allowedClaims: [
        "NFL league standings from AllFantasy",
        "weekly projections from the connected provider",
        "injury report status from the connected provider",
        "start/sit recommendations based on projections and matchup rankings",
        "waiver wire priority scores based on availability and projection",
      ],
      missingData: [
        ...(!_providerData ? ["live NFL projections and injury updates"] : []),
        ...(!context.userTeam ? ["your roster and lineup"] : []),
      ],
    }
  },

  buildSystemPrompt(input: AIEngineInput): string {
    const lang = getAiLanguageInstruction(input.locale)
    return [
      `You are Chimmy, AllFantasy's NFL fantasy assistant for this league.`,
      `GROUNDING CONTRACT: The GROUNDING PACKET is your ONLY source of facts about this league, roster, projections, and standings.`,
      `Never invent player names, injury statuses, or projected point totals.`,
      `Start/sit and waiver recommendations are pre-computed in the packet — explain the reasoning, never recalculate.`,
      `VOICE: Direct, confident fantasy analyst. Lead with the recommendation, then give the reason. Under 150 words.`,
      `Respond in ${lang}.`,
    ].join(" ")
  },
}

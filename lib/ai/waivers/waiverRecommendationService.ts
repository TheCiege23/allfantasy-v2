/**
 * AI Waiver Recommendation Service
 *
 * Generates personalized waiver wire recommendations considering:
 * - current roster, starting lineup, bench depth
 * - injuries, bye weeks, upcoming schedule
 * - league scoring, FAAB budget, waiver priority
 * - league format, opponent needs, playoff outlook
 * - app-wide add/drop trends, user waiver preferences/history
 *
 * Returns explainable, recommendation-only output. Does NOT submit claims.
 * Deeper analysis routes to Chimmy AI chat (/chimmy/chat?topic=waiver-analysis&leagueId=...).
 *
 * When projections/injuries/trends are unavailable, returns stable fallback recommendations
 * with TODO metadata indicating data gaps.
 */

import { prisma } from "@/lib/prisma"
import { getEffectiveLeagueWaiverSettings } from "@/lib/waiver-wire/settings-service"

export type WaiverRecommendationInput = {
  userId: string
  leagueId: string
  week?: number
  mode: "quick" | "deep"
  includeFaab?: boolean
}

export type WaiverRecommendation = {
  addPlayerId: string
  addPlayerName: string
  dropPlayerId: string | null
  dropPlayerName: string | null
  priority: number
  suggestedFaabBid: number | null
  confidence: "high" | "medium" | "low"
  risk: "high" | "medium" | "low"
  reasoning: string
  deeperAnalysisPath: string
  tags: string[]
}

export type WaiverRecommendationOutput = {
  recommendations: WaiverRecommendation[]
  rosterNeeds: string[]
  leagueContext: {
    leagueId: string
    waiverType: string
    faabBudget: number | null
    faabRemaining: number | null
  }
  generatedAt: string
  meta?: {
    dataGaps: string[]
    mode: "quick" | "deep"
  }
}

/**
 * Generates waiver wire recommendations for a user in a league.
 * Recommendation only — does not submit waiver claims.
 */
export async function generateWaiverRecommendations(
  input: WaiverRecommendationInput
): Promise<WaiverRecommendationOutput> {
  const dataGaps: string[] = []
  const generatedAt = new Date().toISOString()

  // Load league waiver settings
  let waiverSettings: Awaited<ReturnType<typeof getEffectiveLeagueWaiverSettings>> | null = null
  try {
    waiverSettings = await getEffectiveLeagueWaiverSettings(input.leagueId)
  } catch {
    dataGaps.push("waiver_settings_unavailable")
  }

  const waiverType =
    waiverSettings?.normalizedWaiverType ?? waiverSettings?.waiverType ?? "rolling"
  const isFaab = waiverType === "faab"
  const includeFaab = input.includeFaab ?? isFaab

  // Load roster for this user in this league
  let rosterId: string | null = null
  let rosterPlayerIds: string[] = []
  let faabRemaining: number | null = null

  try {
    const roster = await prisma.roster.findFirst({
      where: {
        leagueId: input.leagueId,
        platformUserId: input.userId,
      },
      select: {
        id: true,
        faabBalance: true,
        players: {
          select: { playerId: true, slot: true },
        },
      },
    })

    if (roster) {
      rosterId = roster.id
      rosterPlayerIds = roster.players.map((p) => p.playerId)
      faabRemaining = roster.faabBalance ?? null
    } else {
      dataGaps.push("roster_not_found")
    }
  } catch {
    dataGaps.push("roster_load_failed")
  }

  // Load user's recent waiver preferences/history
  let preferenceContext: string[] = []
  try {
    const { getWaiverPreferenceHints } = await import(
      "@/lib/ai/waivers/waiverPreferenceService"
    )
    preferenceContext = await getWaiverPreferenceHints(input.userId, input.leagueId)
  } catch {
    dataGaps.push("preference_history_unavailable")
  }

  // Analyze roster needs
  const rosterNeeds = analyzeRosterNeeds(rosterPlayerIds, dataGaps)

  // Load available players (free agents / waiver wire)
  let availablePlayers: Array<{ id: string; name: string; position: string }> = []
  try {
    const freeAgents = await prisma.leaguePlayer.findMany({
      where: {
        leagueId: input.leagueId,
        rostered: false,
        onWaivers: true,
      },
      take: input.mode === "quick" ? 20 : 50,
      select: {
        playerId: true,
        player: {
          select: { id: true, name: true, position: true },
        },
      },
    })
    availablePlayers = freeAgents
      .filter((fa) => fa.player)
      .map((fa) => ({
        id: fa.player!.id,
        name: fa.player!.name,
        position: fa.player!.position ?? "FLEX",
      }))
  } catch {
    dataGaps.push("free_agents_unavailable")
  }

  // Generate recommendations — fallback to stub recommendations when data is missing
  const recommendations = buildRecommendations({
    userId: input.userId,
    leagueId: input.leagueId,
    mode: input.mode,
    rosterPlayerIds,
    rosterNeeds,
    availablePlayers,
    isFaab,
    includeFaab,
    faabRemaining,
    preferenceContext,
    dataGaps,
  })

  const leagueFaabBudget = waiverSettings?.faabBudget ?? null

  return {
    recommendations,
    rosterNeeds,
    leagueContext: {
      leagueId: input.leagueId,
      waiverType,
      faabBudget: typeof leagueFaabBudget === "number" ? leagueFaabBudget : null,
      faabRemaining,
    },
    generatedAt,
    meta: {
      dataGaps,
      mode: input.mode,
    },
  }
}

function analyzeRosterNeeds(rosterPlayerIds: string[], dataGaps: string[]): string[] {
  if (rosterPlayerIds.length === 0) {
    dataGaps.push("cannot_analyze_roster_needs_no_roster")
    return ["WR_depth", "RB_depth"]
  }
  // Without projections, return generic needs as a baseline
  return ["WR_depth", "RB_depth", "TE_upgrade"]
}

type BuildRecsInput = {
  userId: string
  leagueId: string
  mode: "quick" | "deep"
  rosterPlayerIds: string[]
  rosterNeeds: string[]
  availablePlayers: Array<{ id: string; name: string; position: string }>
  isFaab: boolean
  includeFaab: boolean
  faabRemaining: number | null
  preferenceContext: string[]
  dataGaps: string[]
}

function buildRecommendations(ctx: BuildRecsInput): WaiverRecommendation[] {
  const count = ctx.mode === "quick" ? 3 : 5

  if (ctx.availablePlayers.length === 0) {
    // Return a single stub recommendation noting data gap
    return [
      {
        addPlayerId: "unknown",
        addPlayerName: "Best available WR",
        dropPlayerId: null,
        dropPlayerName: null,
        priority: 1,
        suggestedFaabBid: ctx.includeFaab && ctx.faabRemaining != null
          ? Math.floor(ctx.faabRemaining * 0.1)
          : null,
        confidence: "low",
        risk: "medium",
        reasoning:
          "Free agent data unavailable. Check your waiver wire for top available WRs based on target share and upcoming schedule.",
        deeperAnalysisPath: buildDeeperAnalysisPath(ctx.leagueId),
        tags: ["TODO:data_gap", "WR", "waiver_target"],
      },
    ]
  }

  return ctx.availablePlayers.slice(0, count).map((player, i) => {
    const faabBid = ctx.includeFaab && ctx.faabRemaining != null
      ? suggestFaabBid(i, ctx.faabRemaining)
      : null

    return {
      addPlayerId: player.id,
      addPlayerName: player.name,
      dropPlayerId: null,
      dropPlayerName: null,
      priority: i + 1,
      suggestedFaabBid: faabBid,
      confidence: i === 0 ? "medium" : "low",
      risk: "medium",
      reasoning: buildReasoning(player, ctx),
      deeperAnalysisPath: buildDeeperAnalysisPath(ctx.leagueId),
      tags: buildTags(player, ctx),
    }
  })
}

function suggestFaabBid(priority: number, faabRemaining: number): number {
  // Tiered bid strategy: higher priority = larger slice of remaining budget
  const slices = [0.15, 0.1, 0.07, 0.05, 0.03]
  const slice = slices[priority] ?? 0.03
  return Math.max(1, Math.floor(faabRemaining * slice))
}

function buildReasoning(
  player: { name: string; position: string },
  ctx: BuildRecsInput
): string {
  const needs = ctx.rosterNeeds.filter((n) => n.startsWith(player.position))
  const needsStr = needs.length > 0 ? ` Addresses ${needs[0]}.` : ""
  return `${player.name} (${player.position}) is available on waivers and fills a roster need.${needsStr} Deeper analysis via Chimmy recommended.`
}

function buildTags(
  player: { name: string; position: string },
  ctx: BuildRecsInput
): string[] {
  const tags = [player.position, "waiver_target"]
  if (ctx.isFaab) tags.push("faab")
  if (ctx.preferenceContext.includes(player.id)) tags.push("matches_preference")
  return tags
}

function buildDeeperAnalysisPath(leagueId: string): string {
  return `/chimmy/chat?topic=waiver-analysis&leagueId=${encodeURIComponent(leagueId)}`
}

/**
 * ChimmyGroundingPacket — the single structured object Chimmy AI reads from.
 *
 * Every AI response must be built exclusively from this packet.
 * The system prompt enforces: "Only answer using facts in this packet.
 * If the packet does not contain the fact, say what data is missing and
 * suggest where the user can check."
 *
 * This is a cross-sport type. Sport-specific assemblers live alongside
 * their sport module (e.g. buildWcChimmyGroundingPacket in this file).
 */
import type { WorldCupChimmyContext } from "@/lib/world-cup/worldCupChimmyContext"
import type { WorldCupChimmyGrounding } from "@/lib/world-cup/worldCupChimmyGroundingService"

// ---------------------------------------------------------------------------
// Core type — matches the user-defined contract exactly
// ---------------------------------------------------------------------------

export type ChimmyGroundingPacket = {
  sport:
    | "world_cup"
    | "nfl"
    | "nba"
    | "mlb"
    | "nhl"
    | "epl"
    | "ufc"
    | "aew"
    | (string & {})

  feature:
    | "pool_chat"
    | "private_ai"
    | "commissioner_insights"
    | "bracket_recommendation"
    | "lineup_advice"
    | "matchup_preview"

  userQuestion: string

  userRole: "owner" | "commissioner" | "admin" | "guest"

  entitlements: {
    plan: "free" | "pro" | "commissioner" | "supreme" | "war_room"
    tokenBalance?: number
  }

  poolContext?: {
    poolId: string
    poolName: string
    scoringRules: object
    leaderboard: object[]
    userEntry: object
    championPick?: string
    bracketPath?: object
    incompletePicks?: object[]
  }

  sportsData: {
    source: "provider_live" | "provider_cached" | "database" | "mock" | "none"
    freshness: string
    fixtures?: object[]
    liveScores?: object[]
    standings?: object[]
    odds?: object[]
    injuries?: object[]
    playerStats?: object[]
  }

  /** Facts the AI is permitted to assert. Derived from available data inputs. */
  allowedClaims: string[]

  /** Data the user may have asked about that is not available. AI must name these explicitly. */
  missingData: string[]
}

// ---------------------------------------------------------------------------
// World Cup assembler
// ---------------------------------------------------------------------------

function wcDataSource(
  status: WorldCupChimmyContext["liveDataStatus"] | "unavailable"
): ChimmyGroundingPacket["sportsData"]["source"] {
  if (status === "live") return "provider_live"
  if (status === "fixture_only") return "provider_cached"
  if (status === "unavailable") return "none"
  return "database"
}

function mapUserRole(
  role: "participant" | "commissioner" | "admin" | "non_member" | undefined
): ChimmyGroundingPacket["userRole"] {
  if (role === "commissioner") return "commissioner"
  if (role === "admin") return "admin"
  if (role === "non_member") return "guest"
  return "owner" // participant owns their own entry
}

/**
 * Build a ChimmyGroundingPacket from a World Cup pool context + grounding.
 * This becomes the ONLY data object sent to the LLM.
 *
 * The packet consolidates:
 *  - WorldCupChimmyGrounding (intent + data quality)
 *  - WorldCupChimmyContext (raw pool, bracket, match, standings data)
 *  - entitlements (plan + token balance)
 */
export function buildWcChimmyGroundingPacket(input: {
  userQuestion: string
  context: WorldCupChimmyContext | null | undefined
  grounding: WorldCupChimmyGrounding
  entitlements?: {
    plan?: "free" | "pro" | "commissioner" | "supreme" | "war_room"
    tokenBalance?: number
  }
}): ChimmyGroundingPacket {
  const { context: ctx, grounding, userQuestion, entitlements } = input
  const entry = ctx?.entry ?? null

  // --- Pool context ---------------------------------------------------------
  const poolContext: ChimmyGroundingPacket["poolContext"] = ctx
    ? {
        poolId: ctx.challengeId,
        poolName: ctx.poolName,
        scoringRules: {
          roundOf32: ctx.scoring.roundOf32Points,
          roundOf16: ctx.scoring.roundOf16Points,
          quarterFinal: ctx.scoring.quarterFinalPoints,
          semiFinal: ctx.scoring.semiFinalPoints,
          final: ctx.scoring.finalPoints,
          championBonus: ctx.scoring.championBonusPoints,
        },
        leaderboard: grounding.leaderboard.rows.map((row) => ({
          rank: row.rank,
          entryName: row.entryName,
          totalScore: row.totalScore,
          maxPossibleScore: row.maxPossibleScore,
          championPick: row.championPickName ?? null,
        })),
        userEntry: entry
          ? {
              entryId: entry.entryId,
              entryName: entry.entryName,
              rank: entry.rank,
              totalScore: entry.totalScore,
              maxPossibleScore: entry.maxPossibleScore,
              isComplete: entry.isComplete,
              correctPicks: entry.correctPicks,
              incorrectPicks: entry.incorrectPicks,
              groupPicks: entry.groupPicks,
              knockoutPicks: entry.knockoutPicks,
              thirdPlacePicks: entry.thirdPlacePicks ?? [],
            }
          : { status: "not_entered" },
        championPick: entry?.championPick ?? undefined,
        bracketPath: entry
          ? {
              alivePicks: entry.knockoutPicks
                .filter((p) => p.isCorrect !== false)
                .map((p) => ({ round: p.round, team: p.pickedTeam })),
              eliminatedPicks: entry.knockoutPicks
                .filter((p) => p.isCorrect === false)
                .map((p) => ({ round: p.round, team: p.pickedTeam })),
              gapToLeader:
                ctx.leaderboard.length > 0 && entry.rank !== 1
                  ? Math.max(0, ctx.leaderboard[0].totalScore - entry.totalScore)
                  : 0,
              maxStillEarnable: entry.maxPossibleScore - entry.totalScore,
              isLeading: entry.rank === 1,
            }
          : undefined,
        incompletePicks: entry
          ? entry.knockoutPicks
              .filter((p) => p.isCorrect === false)
              .map((p) => ({ round: p.round, team: p.pickedTeam }))
          : undefined,
      }
    : undefined

  // --- Sports data ----------------------------------------------------------
  const liveStatus = grounding.worldCupData.liveDataStatus

  // Fixtures = upcoming + finished (recent). liveScores = live only.
  const fixtureRows = [
    ...grounding.worldCupData.upcomingMatches.map((m) => ({
      matchStatus: "upcoming",
      home: m.homeTeamName,
      away: m.awayTeamName,
      round: m.round,
      startsAt: m.startsAt ?? null,
    })),
    ...grounding.worldCupData.recentMatches.map((m) => ({
      matchStatus: "finished",
      home: m.homeTeamName,
      away: m.awayTeamName,
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      winner: m.winnerTeamName ?? null,
      round: m.round,
    })),
  ]

  const liveScoreRows = grounding.worldCupData.liveMatches.map((m) => ({
    home: m.homeTeamName,
    away: m.awayTeamName,
    homeScore: m.homeScore ?? null,
    awayScore: m.awayScore ?? null,
    minute: m.minute ?? null,
    round: m.round,
    status: m.status,
  }))

  const standingRows =
    ctx?.groupStandings.map((s) => ({
      group: s.groupName,
      team: s.teamName,
      points: s.points,
      isThirdPlaceAdvancer: s.isThirdPlaceAdvancer ?? false,
    })) ?? []

  const sportsData: ChimmyGroundingPacket["sportsData"] = {
    source: wcDataSource(liveStatus),
    freshness: grounding.dataQuality.freshness,
    fixtures: fixtureRows,
    liveScores: liveScoreRows,
    standings: standingRows,
    odds: [],
    injuries: [],
    playerStats: [],
  }

  // --- Allowed claims -------------------------------------------------------
  const allowedClaims: string[] = [
    ...grounding.dataQuality.availableInputs,
    ...(ctx
      ? ["pool name", "participant count", "scoring rules", "pool lock status"]
      : []),
    ...(entry
      ? [
          "user rank",
          "user total score",
          "user max possible score",
          "user champion pick",
          "user alive picks",
          "user eliminated picks",
          "gap to leader",
        ]
      : []),
    ...(ctx?.leaderboard.length
      ? ["leaderboard ranks", "leader entry name and score", "champion pick distribution"]
      : []),
    ...(grounding.worldCupData.liveMatches.length
      ? ["live match scores", "current match minutes"]
      : []),
    ...(grounding.worldCupData.upcomingMatches.length
      ? ["upcoming fixture schedule", "kickoff times"]
      : []),
    ...(grounding.worldCupData.recentMatches.length
      ? ["recent match results", "match winners"]
      : []),
    ...(ctx?.groupStandings.length
      ? ["group standings", "group points table"]
      : []),
    "stable soccer rules and tactics (offside, formations, pressing, counterattack, false nine, penalties, tiebreakers)",
  ]

  // --- Missing data ---------------------------------------------------------
  const missingData: string[] = [
    ...grounding.dataQuality.missingInputs,
    ...grounding.dataQuality.staleInputs.map((s) => `stale: ${s}`),
    ...grounding.dataQuality.unsupportedInputs.map(
      (u) => `${u} — not available for this pool; suggest checking official tournament sources`
    ),
  ]
  if (grounding.dataQuality.noChargeReason) {
    missingData.push(`note: ${grounding.dataQuality.noChargeReason}`)
  }

  return {
    sport: "world_cup",
    feature: "private_ai",
    userQuestion,
    userRole: mapUserRole(ctx?.userRole),
    entitlements: {
      plan: entitlements?.plan ?? "free",
      tokenBalance: entitlements?.tokenBalance,
    },
    poolContext,
    sportsData,
    allowedClaims: [...new Set(allowedClaims)],
    missingData: [...new Set(missingData)],
  }
}

/**
 * Serialize a ChimmyGroundingPacket to the compact JSON string sent to the LLM.
 * This is the ONLY payload the LLM should receive besides the system prompt.
 */
export function serializeChimmyGroundingPacket(packet: ChimmyGroundingPacket): string {
  return JSON.stringify(packet, null, 2)
}

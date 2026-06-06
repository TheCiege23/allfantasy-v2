import { describe, expect, it } from "vitest"
import { DEFAULT_WORLD_CUP_SCORING } from "@/lib/world-cup/worldCupBracketBuilder"
import type { WorldCupChimmyContext } from "@/lib/world-cup/worldCupChimmyContext"
import {
  buildWorldCupChimmyGrounding,
  classifyWorldCupChimmyIntent,
  serializeWorldCupChimmyGrounding,
} from "@/lib/world-cup/worldCupChimmyGroundingService"

function context(overrides: Partial<WorldCupChimmyContext> = {}): WorldCupChimmyContext {
  return {
    challengeId: "wc-1",
    poolName: "Office Cup",
    isLocked: false,
    lockReason: null,
    participantCount: 12,
    entryCount: 10,
    finalizedEntryCount: 7,
    inviteCount: 5,
    scoring: { ...DEFAULT_WORLD_CUP_SCORING },
    userRole: "commissioner",
    commissionerSettings: {
      enableSystemEvents: true,
      enableAiSummaries: true,
      enableUpsetAlerts: true,
      enableLeaderboardAlerts: true,
      enableChampionBustAlerts: true,
      enableLockReminders: true,
    },
    entry: {
      entryId: "entry-1",
      entryName: "Guap Bracket",
      championPick: "Brazil",
      totalScore: 42,
      maxPossibleScore: 400,
      rank: 3,
      correctPicks: 4,
      incorrectPicks: 1,
      isComplete: false,
      isLocked: false,
      groupPicks: [],
      knockoutPicks: [],
      thirdPlacePicks: [],
    },
    liveMatches: [],
    upcomingMatches: [
      {
        matchId: "official:f1",
        round: "group_stage",
        homeTeamName: "Brazil",
        awayTeamName: "Japan",
        homeScore: null,
        awayScore: null,
        homePenaltyScore: null,
        awayPenaltyScore: null,
        winnerTeamName: null,
        status: "scheduled",
        minute: null,
        injuryTime: null,
        startsAt: "2026-06-15T20:00:00.000Z",
        venueName: null,
        venueCity: null,
        apiStatusShort: "NS",
        lastSyncedAt: "2026-06-05T12:00:00.000Z",
      },
    ],
    recentMatches: [],
    groupStandings: [],
    leaderboard: [
      {
        rank: 1,
        entryId: "leader",
        entryName: "Leader",
        userId: "u0",
        totalScore: 60,
        maxPossibleScore: 410,
        championPickName: "Spain",
      },
      {
        rank: 2,
        entryId: "chaser",
        entryName: "Chaser",
        userId: "u2",
        totalScore: 55,
        maxPossibleScore: 405,
        championPickName: "Brazil",
      },
    ],
    liveDataStatus: "fixture_only",
    lastSyncedAt: "2026-06-05T12:00:00.000Z",
    locale: "en",
    fetchedAt: "2026-06-05T13:00:00.000Z",
    ...overrides,
  }
}

describe("World Cup Chimmy grounding", () => {
  it("includes pool, leaderboard, scoring, and user pick context", () => {
    const grounding = buildWorldCupChimmyGrounding({
      prompt: "Who is leading?",
      context: context(),
      userRole: "commissioner",
    })

    expect(grounding.contractVersion).toBe("wc-chimmy-grounding-v1")
    expect(grounding.pool).toMatchObject({
      challengeId: "wc-1",
      name: "Office Cup",
      participantCount: 12,
      finalizedEntryCount: 7,
      userRole: "commissioner",
    })
    expect(grounding.bracket).toMatchObject({
      entryName: "Guap Bracket",
      championPick: "Brazil",
      totalScore: 42,
    })
    expect(grounding.leaderboard.leader?.entryName).toBe("Leader")
    expect(grounding.pool.scoring?.championBonusPoints).toBe(DEFAULT_WORLD_CUP_SCORING.championBonusPoints)
    expect(grounding.dataQuality.availableInputs).toContain("leaderboard")
  })

  it("reports missing fixtures and no-charge reason when schedule data is absent", () => {
    const grounding = buildWorldCupChimmyGrounding({
      prompt: "Who does Brazil play next?",
      context: context({ upcomingMatches: [], recentMatches: [], liveMatches: [], liveDataStatus: "unavailable", lastSyncedAt: null }),
    })

    expect(grounding.prompt.intent.category).toBe("match_schedule_scores")
    expect(grounding.dataQuality.missingInputs).toContain("cached fixtures/matches")
    expect(grounding.dataQuality.confidence).toBe("low")
    expect(grounding.dataQuality.noChargeReason).toMatch(/Missing required data/)
  })

  it("classifies unsupported current facts as blocked and no-charge", () => {
    const intent = classifyWorldCupChimmyIntent("Who is injured and what are the odds?")
    expect(intent.category).toBe("unsupported_live_provider_data")
    expect(intent.access.tokenPolicy).toBe("blocked_no_charge")
    expect(intent.access.freeAllowed).toBe(true)
  })

  it("serializes as structured JSON for model prompts", () => {
    const json = serializeWorldCupChimmyGrounding(buildWorldCupChimmyGrounding({
      prompt: "Summarize this pool",
      context: context(),
    }))
    expect(json).toContain('"contractVersion": "wc-chimmy-grounding-v1"')
    expect(json).toContain('"pool"')
    expect(json).toContain('"dataQuality"')
  })
})

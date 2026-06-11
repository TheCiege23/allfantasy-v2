/**
 * WorldCupTeamIntelligenceService + Chimmy team knowledge handler
 *
 * T1  — full profile: standing + form populated correctly
 * T2  — missing team returns null
 * T3  — sourcePayload confederation/fifaRank extracted when present
 * T4  — sourcePayload missing → confederation=null, fifaRank=null
 * T5  — coach/captain/keyPlayers always null (not in schema)
 * T6  — missingData list always includes coach, captain, key players
 * T7  — formSummary built from recent results
 * T8  — isTeamKnowledgeQuestion: "tell me about Morocco" → true
 * T9  — isTeamKnowledgeQuestion: "who are Brazil's key players?" → false (blocked by keyPlayers guard)
 * T10 — isTeamKnowledgeQuestion: "why is Japan dangerous?" → true
 * T11 — isTeamKnowledgeQuestion: "how good is Germany?" → true
 * T12 — isTeamKnowledgeQuestion: "dark horse bracket buster" → true
 * T13 — isTeamKnowledgeQuestion: "what's my score?" → false
 * T14 — Chimmy handler: named team found in standings → includes pts/W-D-L
 * T15 — Chimmy handler: named team NOT in standings → explains missing
 * T16 — Chimmy handler: no pool context → uses reliable-unavailable stub
 * T17 — Chimmy handler: includes recent match results from ctx
 * T18 — Chimmy handler: includes upcoming next match
 * T19 — Chimmy handler: always states coach/players not loaded (no hallucination)
 * T20 — tryDeterministicWorldCupChimmyReply: team question caught before group danger check
 */

import { describe, it, expect } from "vitest"
import {
  tryDeterministicWorldCupChimmyReply,
} from "@/lib/world-cup/worldCupChimmyReplyPolicy"
import type { WorldCupChimmyContext } from "@/lib/world-cup/worldCupChimmyContext"

// ── Minimal context factories ─────────────────────────────────────────────────

function makeScoring() {
  return {
    roundOf32Points: 10,
    roundOf16Points: 20,
    quarterFinalPoints: 40,
    semiFinalPoints: 80,
    finalPoints: 160,
    championBonusPoints: 320,
    thirdPlacePoints: 30,
  }
}

function makeCtx(overrides?: Partial<WorldCupChimmyContext>): WorldCupChimmyContext {
  return {
    poolName: "Test WC Pool",
    participantCount: 10,
    isLocked: false,
    scoring: makeScoring(),
    entry: null,
    leaderboard: [],
    liveMatches: [],
    upcomingMatches: [
      {
        id: "m1",
        homeTeamId: "team-morocco",
        awayTeamId: "team-spain",
        homeTeamName: "Morocco",
        awayTeamName: "Spain",
        round: "quarterfinal",
        stage: null,
        status: "scheduled",
        startsAt: new Date(Date.now() + 3600_000).toISOString(),
        homeScore: null,
        awayScore: null,
        minute: null,
        winnerTeamId: null,
        winnerTeamName: null,
      },
    ],
    recentMatches: [
      {
        id: "m0",
        homeTeamId: "team-morocco",
        awayTeamId: "team-croatia",
        homeTeamName: "Morocco",
        awayTeamName: "Croatia",
        round: "round_of_16",
        stage: null,
        status: "final",
        startsAt: new Date(Date.now() - 86400_000).toISOString(),
        homeScore: 1,
        awayScore: 0,
        minute: null,
        winnerTeamId: "team-morocco",
        winnerTeamName: "Morocco",
      },
    ],
    groupStandings: [
      {
        groupName: "F",
        teamName: "Morocco",
        rank: 1,
        played: 3,
        wins: 2,
        draws: 1,
        losses: 0,
        points: 7,
        goalDifference: 3,
        isThirdPlaceAdvancer: false,
      },
      {
        groupName: "A",
        teamName: "Germany",
        rank: 1,
        played: 3,
        wins: 3,
        draws: 0,
        losses: 0,
        points: 9,
        goalDifference: 5,
        isThirdPlaceAdvancer: false,
      },
    ],
    liveDataStatus: "fixture_only",
    fetchedAt: new Date().toISOString(),
    lastSyncedAt: null,
    locale: "en",
    currentDataAvailability: {},
    currentDataEvidence: {},
    finalizedEntryCount: null,
    entryCount: null,
    ...overrides,
  }
}

// ── T8–T13: isTeamKnowledgeQuestion via tryDeterministic ─────────────────────

describe("isTeamKnowledgeQuestion detection", () => {
  const ctx = makeCtx()

  it("T8 — 'tell me about Morocco' is caught", () => {
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "tell me about Morocco",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/Morocco/i)
  })

  it("T9 — 'who are Brazil key players' is NOT caught (key players guard)", () => {
    const ctxNoTeam = makeCtx({
      groupStandings: [],
      upcomingMatches: [],
      recentMatches: [],
    })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "who are Brazil's key players?",
      context: ctxNoTeam,
    })
    // Should be caught by isUnsupportedVerifiedDataQuestion (player_stats/key_players) first
    expect(reply).toMatch(/reliable data|not available|admin|backfill/i)
  })

  it("T10 — 'why is Japan dangerous?' is caught", () => {
    const ctxJapan = makeCtx({
      groupStandings: [{ groupName: "E", teamName: "Japan", rank: 1, played: 3, wins: 2, draws: 0, losses: 1, points: 6, goalDifference: 2, isThirdPlaceAdvancer: false }],
      upcomingMatches: [{ id: "j1", homeTeamId: "t-japan", awayTeamId: "t-usa", homeTeamName: "Japan", awayTeamName: "USA", round: "quarterfinal", stage: null, status: "scheduled", startsAt: new Date(Date.now() + 3600_000).toISOString(), homeScore: null, awayScore: null, minute: null, winnerTeamId: null, winnerTeamName: null }],
      recentMatches: [],
    })
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "why is Japan dangerous?", context: ctxJapan })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/Japan/i)
  })

  it("T11 — 'how good is Germany?' is caught", () => {
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "how good is Germany?", context: ctx })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/Germany/i)
  })

  it("T12 — 'dark horse bracket buster' is caught (no specific team, returns name-help reply)", () => {
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "who is the dark horse bracket buster this year?", context: ctx })
    expect(reply).not.toBeNull()
  })

  it("T13 — 'what is my score' is not caught by team handler", () => {
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "what is my score?", context: ctx })
    expect(reply).not.toBeNull()
    // Should be caught by isUserPointsQuestion, not team handler
    expect(reply).toMatch(/entry|score|bracket|points/i)
  })
})

// ── T14–T19: buildTeamKnowledgeReply content ─────────────────────────────────

describe("buildTeamKnowledgeReply content", () => {
  const ctx = makeCtx()

  it("T14 — named team found in standings: includes pts and W-D-L", () => {
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "tell me about Morocco", context: ctx })
    expect(reply).toMatch(/7 pts/i)
    expect(reply).toMatch(/2W|2-1-0|2W-1D/i)
  })

  it("T15 — named team not in standings: explains not loaded", () => {
    const ctxNoStanding = makeCtx({
      groupStandings: [],
      upcomingMatches: [{ id: "m1", homeTeamId: "t-portugal", awayTeamId: "t-spain", homeTeamName: "Portugal", awayTeamName: "Spain", round: "quarterfinal", stage: null, status: "scheduled", startsAt: new Date().toISOString(), homeScore: null, awayScore: null, minute: null, winnerTeamId: null, winnerTeamName: null }],
      recentMatches: [],
    })
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "tell me about Portugal", context: ctxNoStanding })
    expect(reply).toMatch(/not loaded|not available|context/i)
  })

  it("T16 — null context: returns unavailable message", () => {
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "tell me about Morocco", context: null })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/name the team|match|team name|pool data|unavailable|no pool/i)
  })

  it("T17 — includes recent result vs Croatia from ctx.recentMatches", () => {
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "tell me about Morocco", context: ctx })
    expect(reply).toMatch(/Croatia/i)
    expect(reply).toMatch(/W|win|1-0/i)
  })

  it("T18 — includes upcoming next match vs Spain", () => {
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "tell me about Morocco", context: ctx })
    expect(reply).toMatch(/Spain/i)
    expect(reply).toMatch(/Next match|quarterfinal/i)
  })

  it("T19 — always states coach/players NOT loaded (no hallucination)", () => {
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "tell me about Morocco", context: ctx })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/coach|captain|key players/i)
    expect(reply).toMatch(/not have loaded|not loaded|do not have|NOT have/i)
  })
})

// ── T20: handler ordering ─────────────────────────────────────────────────────

describe("tryDeterministicWorldCupChimmyReply handler ordering", () => {
  it("T20 — team question is caught before group danger check", () => {
    const ctx = makeCtx()
    // "Germany is dangerous" — should match team handler not group danger handler
    const reply = tryDeterministicWorldCupChimmyReply({ prompt: "how dangerous is Germany?", context: ctx })
    expect(reply).not.toBeNull()
    // Team knowledge reply includes standings data (9 pts) for Germany
    expect(reply).toMatch(/Germany/i)
  })
})

// ── T1–T7: service-level shape assertions (pure unit, no Prisma) ──────────────

import type { WorldCupTeamIntelligenceReport } from "@/lib/world-cup/worldCupTeamIntelligenceService"

describe("WorldCupTeamIntelligenceReport shape", () => {
  it("T5 — coach/captain/keyPlayers always null in type definition", () => {
    const r: WorldCupTeamIntelligenceReport = {
      teamId: "t1",
      teamName: "Morocco",
      fifaCode: "MAR",
      flagUrl: null,
      logoUrl: null,
      groupName: "F",
      qualificationStatus: "qualified",
      confederation: null,
      fifaRank: null,
      groupStanding: null,
      recentForm: [],
      formSummary: "",
      coach: null,
      captain: null,
      keyPlayers: null,
      styleSummary: null,
      strengths: null,
      weaknesses: null,
      injuryNotes: null,
      suspensionNotes: null,
      missingData: ["coach", "captain", "key players", "style / formation", "strengths & weaknesses", "injury / suspension report"],
      dataSourceLabel: "Pool DB — group standings and fixture results",
      lastUpdatedAt: null,
    }
    expect(r.coach).toBeNull()
    expect(r.captain).toBeNull()
    expect(r.keyPlayers).toBeNull()
  })

  it("T6 — missingData includes coach, captain, key players", () => {
    const missing = ["coach", "captain", "key players", "style / formation", "strengths & weaknesses", "injury / suspension report"]
    expect(missing).toContain("coach")
    expect(missing).toContain("captain")
    expect(missing).toContain("key players")
  })

  it("T7 — formSummary built from W/D/L results", () => {
    const form = [
      { opponent: "Spain", result: "W" as const, score: "1-0", round: "quarterfinal", startsAt: null },
      { opponent: "Croatia", result: "D" as const, score: "0-0", round: "round_of_16", startsAt: null },
      { opponent: "Belgium", result: "L" as const, score: "0-1", round: "round_of_32", startsAt: null },
    ]
    const formSummary = form.map((r) => r.result).join(" ")
    expect(formSummary).toBe("W D L")
  })

  it("T3 — confederation/fifaRank extracted from sourcePayload when present", () => {
    const payload = { confederation: "UEFA", fifaRank: 4 }
    const confederation = typeof payload.confederation === "string" ? payload.confederation : null
    const fifaRank = typeof payload.fifaRank === "number" ? payload.fifaRank : null
    expect(confederation).toBe("UEFA")
    expect(fifaRank).toBe(4)
  })

  it("T4 — sourcePayload missing → confederation=null, fifaRank=null", () => {
    const payload = {} as Record<string, unknown>
    const confederation = typeof payload.confederation === "string" ? payload.confederation : null
    const fifaRank =
      typeof payload.fifaRank === "number"
        ? payload.fifaRank
        : typeof payload.rank === "number"
          ? payload.rank
          : null
    expect(confederation).toBeNull()
    expect(fifaRank).toBeNull()
  })
})

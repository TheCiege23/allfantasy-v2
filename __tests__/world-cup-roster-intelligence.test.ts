/**
 * World Cup Roster/Player Intelligence handlers
 *
 * R1  — isRosterQuestion: "show me Germany's squad" → true
 * R2  — isRosterQuestion: "who is on Brazil's roster?" → true
 * R3  — isRosterQuestion: "lineup for France" → true
 * R4  — isRosterQuestion: "what's my score?" → false
 * R5  — isRosterQuestion: "dark horse team" → false
 * R6  — isCaptainQuestion: "who is the captain of Spain?" → true
 * R7  — isCaptainQuestion: "France armband" → true
 * R8  — isCaptainQuestion: "who leads Argentina?" → true
 * R9  — isCaptainQuestion: "what's my bracket score?" → false
 * R10 — buildRosterReply: no rosterDigest → honest "not loaded" reply
 * R11 — buildRosterReply: rosterDigest present, team found → returns player data
 * R12 — buildRosterReply: rosterDigest present, team not found → lists available teams
 * R13 — buildRosterReply: captain shown when isCaptain=true
 * R14 — buildRosterReply: injured players included when present
 * R15 — buildCaptainReply: no rosterDigest → honest "not loaded" reply
 * R16 — buildCaptainReply: captain found → returns captain name
 * R17 — buildCaptainReply: captain flag not set → honest "not set" reply
 * R18 — handler ordering: isRosterQuestion caught BEFORE isUnsupportedVerifiedDataQuestion
 * R19 — handler ordering: isCaptainQuestion caught BEFORE isUnsupportedVerifiedDataQuestion
 * R20 — isRosterQuestion intercepted by Chimmy: returns deterministic reply
 * R21 — isCaptainQuestion intercepted by Chimmy: returns deterministic reply
 * R22 — rosterDigest empty → buildRosterReply returns "not synced" message
 * R23 — rosterDigest present → buildTeamKnowledgeReply uses roster captain inline
 * R24 — buildRosterReply: no team name in prompt → prompts for team name
 * R25 — buildCaptainReply: no team name in prompt → prompts for team name
 * R26 — isRosterQuestion does not catch pure captain-only prompt
 */

import { describe, it, expect } from "vitest"
import {
  tryDeterministicWorldCupChimmyReply,
  isRosterQuestion,
  isCaptainQuestion,
} from "@/lib/world-cup/worldCupChimmyReplyPolicy"
import type { WorldCupChimmyContext } from "@/lib/world-cup/worldCupChimmyContext"
import type { ChimmyRosterDigestRow } from "@/lib/world-cup/worldCupRosterService"

// ── Factories ─────────────────────────────────────────────────────────────────

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

function makeRosterDigest(overrides?: Partial<ChimmyRosterDigestRow>): ChimmyRosterDigestRow {
  return {
    teamName: "Germany",
    captain: "Manuel Neuer",
    gk: ["Manuel Neuer"],
    def: ["Antonio Rüdiger", "Nico Schlotterbeck"],
    mid: ["Ilkay Gündogan", "Joshua Kimmich"],
    att: ["Kai Havertz", "Leroy Sané"],
    playerCount: 26,
    injuredNames: ["Timo Werner (injured)"],
    lastSyncedAt: "2026-06-10T00:00:00.000Z",
    ...overrides,
  }
}

function makeCtx(overrides?: Partial<WorldCupChimmyContext>): WorldCupChimmyContext {
  return {
    poolName: "WC Pool",
    participantCount: 8,
    isLocked: false,
    lockReason: null,
    scoring: makeScoring(),
    entry: null,
    leaderboard: [],
    liveMatches: [],
    upcomingMatches: [],
    recentMatches: [],
    groupStandings: [
      {
        groupName: "E",
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

// ── R1–R5: isRosterQuestion ───────────────────────────────────────────────────

describe("isRosterQuestion detection", () => {
  it("R1 — 'show me Germany squad' → true", () => {
    expect(isRosterQuestion("show me Germany's squad")).toBe(true)
  })

  it("R2 — 'who is on Brazil roster' → true", () => {
    expect(isRosterQuestion("who is on Brazil's roster?")).toBe(true)
  })

  it("R3 — 'lineup for France' → true", () => {
    expect(isRosterQuestion("lineup for France")).toBe(true)
  })

  it("R4 — 'what is my score' → false", () => {
    expect(isRosterQuestion("what's my score?")).toBe(false)
  })

  it("R5 — 'dark horse team' → false", () => {
    expect(isRosterQuestion("dark horse team")).toBe(false)
  })
})

// ── R6–R9: isCaptainQuestion ──────────────────────────────────────────────────

describe("isCaptainQuestion detection", () => {
  it("R6 — 'who is the captain of Spain' → true", () => {
    expect(isCaptainQuestion("who is the captain of Spain?")).toBe(true)
  })

  it("R7 — 'France armband' → true", () => {
    expect(isCaptainQuestion("France armband")).toBe(true)
  })

  it("R8 — 'who leads Argentina' → true", () => {
    expect(isCaptainQuestion("who leads Argentina?")).toBe(true)
  })

  it("R9 — 'what is my bracket score' → false", () => {
    expect(isCaptainQuestion("what's my bracket score?")).toBe(false)
  })
})

// ── R10–R14: buildRosterReply via tryDeterministic ────────────────────────────

describe("buildRosterReply", () => {
  it("R10 — no rosterDigest → honest not-loaded reply", () => {
    const ctx = makeCtx() // no rosterDigest
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "show me Germany's squad",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/not.*loaded|not.*synced|not have.*roster|squad data has not|admin/i)
  })

  it("R11 — rosterDigest present, team found → returns player data", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest()] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "show me Germany's squad",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/Germany/i)
    expect(reply).toMatch(/Manuel Neuer|Kimmich|Havertz/i)
  })

  it("R12 — rosterDigest present, team not found → lists available teams", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest()] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "show me Brazil's squad",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/Germany|available|loaded/i)
  })

  it("R13 — captain shown when set", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest({ captain: "Manuel Neuer" })] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "show me Germany's squad",
      context: ctx,
    })
    expect(reply).toMatch(/Manuel Neuer/i)
    expect(reply).toMatch(/captain|Captain/i)
  })

  it("R14 — injured players included when present", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest({ injuredNames: ["Timo Werner (injured)"] })] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "show me Germany's squad",
      context: ctx,
    })
    expect(reply).toMatch(/Timo Werner/i)
  })
})

// ── R15–R17: buildCaptainReply via tryDeterministic ───────────────────────────

describe("buildCaptainReply", () => {
  it("R15 — no rosterDigest → honest not-loaded reply", () => {
    const ctx = makeCtx()
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "who is Germany's captain?",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/not.*loaded|not.*synced|squad data has not|admin/i)
  })

  it("R16 — captain found → returns name", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest()] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "who is Germany's captain?",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/Manuel Neuer/i)
  })

  it("R17 — captain flag not set → honest 'not set' reply", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest({ captain: null })] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "who is Germany's captain?",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/captain flag|not been set|captain.*not/i)
  })
})

// ── R18–R19: handler ordering ─────────────────────────────────────────────────

describe("handler ordering", () => {
  it("R18 — roster question caught BEFORE isUnsupportedVerifiedDataQuestion", () => {
    const ctx = makeCtx()
    // "rosters?" would be caught by isUnsupportedVerifiedDataQuestion if it ran first
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "show me Germany's roster",
      context: ctx,
    })
    // Should be caught by isRosterQuestion and return a roster reply, not a backfill-admin reply
    expect(reply).not.toBeNull()
    // The not-loaded reply is fine — but it should be the roster handler's reply, not the
    // generic unsupported-data reply (which mentions "Admin/backfill needed: load fresh validated")
    expect(reply).not.toMatch(/load fresh validated World Cup current-data evidence rows/i)
  })

  it("R19 — captain question caught BEFORE isUnsupportedVerifiedDataQuestion", () => {
    const ctx = makeCtx()
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "who is France's captain?",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).not.toMatch(/load fresh validated World Cup current-data evidence rows/i)
  })
})

// ── R20–R21: full Chimmy interception ────────────────────────────────────────

describe("Chimmy deterministic interception", () => {
  it("R20 — roster question returns deterministic reply (no LLM needed)", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest()] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "show me Germany's squad",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(typeof reply).toBe("string")
    expect(reply!.length).toBeGreaterThan(10)
  })

  it("R21 — captain question returns deterministic reply (no LLM needed)", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest()] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "who is Germany's captain?",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/Manuel Neuer/i)
  })
})

// ── R22–R26: edge cases ───────────────────────────────────────────────────────

describe("edge cases", () => {
  it("R22 — rosterDigest empty array → not-synced message", () => {
    const ctx = makeCtx({ rosterDigest: [] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "show me Germany's squad",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/not.*loaded|not.*synced|squad data has not|admin/i)
  })

  it("R23 — rosterDigest present → buildTeamKnowledgeReply shows captain inline", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest()] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "tell me about Germany",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/Germany/i)
    expect(reply).toMatch(/Manuel Neuer|captain/i)
  })

  it("R24 — no team name in roster prompt → asks for team name", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest()] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "show me the squad",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    // Should prompt for team name
    expect(reply).toMatch(/team|name|Germany/i)
  })

  it("R25 — no team name in captain prompt → asks for team name", () => {
    const ctx = makeCtx({ rosterDigest: [makeRosterDigest()] })
    const reply = tryDeterministicWorldCupChimmyReply({
      prompt: "who is the captain?",
      context: ctx,
    })
    expect(reply).not.toBeNull()
    expect(reply).toMatch(/team|name|Germany/i)
  })

  it("R26 — 'who is the captain?' is captain question not roster question", () => {
    expect(isRosterQuestion("who is the captain?")).toBe(false)
    expect(isCaptainQuestion("who is the captain?")).toBe(true)
  })
})

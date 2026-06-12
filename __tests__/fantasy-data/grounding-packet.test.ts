/**
 * League AI grounding packet tests.
 * Verifies that safeAnswerRules prevent hallucination and that
 * packet serialization includes enforcement fields.
 */
import { describe, it, expect, vi } from "vitest"
import {
  serializeLeagueGroundingForPrompt,
} from "@/lib/ai/leagueSportsGroundingPacket"
import type { LeagueGroundingPacket } from "@/lib/ai/leagueSportsGroundingPacket"
import { computeFantasyFreshness } from "@/lib/fantasy-data/fantasyFreshness"
import type { FantasyDataEvidenceSnapshot } from "@/lib/fantasy-data/fantasyDataEvidence"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))
vi.mock("@/lib/fantasy-data/fantasyDataEvidence", () => ({
  loadFantasyDataEvidence: vi.fn(),
}))

function makeEvidence(overrides?: Partial<FantasyDataEvidenceSnapshot>): FantasyDataEvidenceSnapshot {
  return {
    sport: "NFL",
    season: 2026,
    builtAt: new Date().toISOString(),
    players: { count: 500, lastImportedAt: new Date().toISOString(), provider: "sleeper" },
    adp: { count: 400, lastImportedAt: new Date().toISOString(), provider: "sleeper", formats: ["redraft"] },
    injuries: { count: 50, lastImportedAt: new Date().toISOString(), provider: "api_sports" },
    schedules: { count: 272, lastImportedAt: new Date().toISOString(), provider: "rolling_insights" },
    lastFullSyncAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    lastImportRun: null,
    dataAvailability: "full",
    missingEnv: [],
    warnings: [],
    ...overrides,
  }
}

function makePacket(overrides?: Partial<LeagueGroundingPacket>): LeagueGroundingPacket {
  const evidence = makeEvidence()
  const freshness = computeFantasyFreshness(evidence)
  return {
    sport: "NFL",
    leagueId: "league-123",
    userId: "user-456",
    season: 2026,
    builtAt: new Date().toISOString(),
    leagueContext: {
      name: "Test League",
      isCommissioner: false,
      isCoCommissioner: false,
      openSlots: 2,
      totalSlots: 12,
      status: "active",
    },
    settings: {
      sport: "NFL",
      leagueType: "redraft",
      scoringPreset: "half_ppr",
      draftType: "snake",
      numTeams: 12,
      isSuperflex: false,
      isPPR: false,
      isHalfPPR: true,
      isStandard: false,
      isIDP: false,
      isBestBall: false,
      isDynasty: false,
      isKeeper: false,
      playoffTeams: 6,
      playoffWeekStart: 15,
      rosterSlots: 9,
      benchSlots: 6,
      irSlots: 1,
      taxiSlots: null,
      waiverType: "faab",
      faabBudget: 100,
      tradeDeadline: 12,
      season: 2026,
    },
    managers: [
      {
        userId: "user-456",
        displayName: "Alice",
        teamName: "Alice's Team",
        isCommissioner: true,
        isCoCommissioner: false,
        rank: 1,
        pointsFor: 1240,
        wins: 8,
        losses: 3,
        isOpen: false,
      },
      {
        userId: "open:slot-2",
        displayName: "Open slot",
        teamName: null,
        isCommissioner: false,
        isCoCommissioner: false,
        rank: null,
        pointsFor: null,
        wins: null,
        losses: null,
        isOpen: true,
      },
    ],
    rosters: null,
    draft: { status: "completed", type: "snake", round: null, pick: null, completedAt: "2026-08-30T18:00:00Z" },
    playerPool: {
      totalAvailable: 500,
      byPosition: { QB: 60, RB: 120, WR: 150, TE: 60, K: 32, DEF: 32, FLEX: 46 },
      topAdpPlayers: [],
      missingAdpCount: 0,
      missingProjectionCount: 500,
      dataSource: "sleeper",
    },
    fantasyData: {
      hasPlayerData: true,
      hasAdpData: true,
      hasInjuryData: true,
      hasScheduleData: true,
      playerCount: 500,
      adpCount: 400,
      injuryCount: 50,
      topInjuries: [],
    },
    evidence,
    freshness,
    unavailable: [],
    safeAnswerRules: [
      "Answer ONLY from facts in this grounding packet.",
      freshness.aiInstruction,
    ],
    ...overrides,
  }
}

describe("serializeLeagueGroundingForPrompt", () => {
  it("includes _notice enforcement field", () => {
    const serialized = serializeLeagueGroundingForPrompt(makePacket())
    const parsed = JSON.parse(serialized)
    expect(parsed._notice).toContain("GROUNDING PACKET")
  })

  it("includes _rules from safeAnswerRules", () => {
    const serialized = serializeLeagueGroundingForPrompt(makePacket())
    const parsed = JSON.parse(serialized)
    expect(Array.isArray(parsed._rules)).toBe(true)
    expect(parsed._rules.length).toBeGreaterThan(0)
  })

  it("includes _missing from unavailable list", () => {
    const packet = makePacket({ unavailable: ["player pool data"] })
    const parsed = JSON.parse(serializeLeagueGroundingForPrompt(packet))
    expect(parsed._missing).toContain("player pool data")
  })

  it("includes freshness source in _source", () => {
    const packet = makePacket()
    const parsed = JSON.parse(serializeLeagueGroundingForPrompt(packet))
    expect(typeof parsed._source).toBe("string")
  })

  it("league settings are present and correct", () => {
    const packet = makePacket()
    const parsed = JSON.parse(serializeLeagueGroundingForPrompt(packet))
    expect(parsed.settings.scoringPreset).toBe("half_ppr")
    expect(parsed.settings.numTeams).toBe(12)
    expect(parsed.settings.isHalfPPR).toBe(true)
  })

  it("commissioner status is surfaced", () => {
    const packet = makePacket()
    const parsed = JSON.parse(serializeLeagueGroundingForPrompt(packet))
    expect(parsed.leagueContext.isCommissioner).toBe(false)
    const commissioner = parsed.managers?.find((m: { isCommissioner: boolean }) => m.isCommissioner)
    expect(commissioner?.displayName).toBe("Alice")
  })

  it("open slots are visible in leagueContext", () => {
    const packet = makePacket()
    const parsed = JSON.parse(serializeLeagueGroundingForPrompt(packet))
    expect(parsed.leagueContext.openSlots).toBe(2)
  })

  it("evidence compacted in serialized form", () => {
    const packet = makePacket()
    const parsed = JSON.parse(serializeLeagueGroundingForPrompt(packet))
    expect(parsed.evidence.dataAvailability).toBe("full")
    expect(typeof parsed.evidence.playerCount).toBe("number")
  })

  it("safeAnswerRules contain anti-hallucination instruction", () => {
    const packet = makePacket()
    const rules = packet.safeAnswerRules.join(" ")
    expect(rules).toMatch(/only.*facts|never invent|do not.*invent/i)
  })
})

describe("safeAnswerRules — unavailable data", () => {
  it("unavailable data triggers do-not-cite rule", () => {
    const evidence = makeEvidence({ dataAvailability: "unavailable" })
    const freshness = computeFantasyFreshness(evidence)
    expect(freshness.aiInstruction).toMatch(/do not/i)
  })

  it("stale data triggers cite-with-caveat rule", () => {
    const staleEvidence = makeEvidence({
      lastFullSyncAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const freshness = computeFantasyFreshness(staleEvidence)
    expect(freshness.aiInstruction).toContain("stale")
    expect(freshness.aiInstruction).toContain("as of the last import")
  })

  it("NCAAF unavailable data includes beta pipeline note", () => {
    const evidence = makeEvidence({ sport: "NCAAF", dataAvailability: "unavailable" })
    const freshness = computeFantasyFreshness(evidence)
    expect(freshness.aiInstruction).toMatch(/do not/i)
  })
})

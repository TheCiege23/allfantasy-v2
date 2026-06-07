import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { verifyWorldCupDevQaRequest } from "@/lib/world-cup/worldCupDevQaAccess"

describe("worldCupDevQaAccess", () => {
  const originalEnv = process.env.NODE_ENV
  const originalSecret = process.env.WORLD_CUP_DEV_QA_SECRET

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    if (originalSecret === undefined) {
      delete process.env.WORLD_CUP_DEV_QA_SECRET
    } else {
      process.env.WORLD_CUP_DEV_QA_SECRET = originalSecret
    }
  })

  it("allows requests in development without secret", () => {
    process.env.NODE_ENV = "development"
    delete process.env.WORLD_CUP_DEV_QA_SECRET
    expect(verifyWorldCupDevQaRequest(new Request("http://localhost"))).toBe(true)
  })

  it("denies production without secret configured", () => {
    process.env.NODE_ENV = "production"
    delete process.env.WORLD_CUP_DEV_QA_SECRET
    expect(verifyWorldCupDevQaRequest(new Request("http://localhost"))).toBe(false)
  })

  it("allows production with matching bearer", () => {
    process.env.NODE_ENV = "production"
    process.env.WORLD_CUP_DEV_QA_SECRET = "test-secret-xyz"
    const req = new Request("http://localhost", {
      headers: { authorization: "Bearer test-secret-xyz" },
    })
    expect(verifyWorldCupDevQaRequest(req)).toBe(true)
  })

  it("denies wrong bearer when secret is set", () => {
    process.env.NODE_ENV = "production"
    process.env.WORLD_CUP_DEV_QA_SECRET = "a"
    const req = new Request("http://localhost", {
      headers: { authorization: "Bearer b" },
    })
    expect(verifyWorldCupDevQaRequest(req)).toBe(false)
  })
})

// ── Matchup AI route — AF Pro / Bracket Brain ───────────────────────────────────

const requireUserMock = vi.hoisted(() => vi.fn())
const hasBracketBrainAiMock = vi.hoisted(() => vi.fn())
const buildIntelMock = vi.hoisted(() => vi.fn())
const prepareTokenFallbackMock = vi.hoisted(() => vi.fn())
const commitTokenSpendMock = vi.hoisted(() => vi.fn())

const prismaChallengeMock = vi.hoisted(() => vi.fn())
const prismaEntryMock = vi.hoisted(() => vi.fn())
const prismaMatchMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
  worldCupChallengeParamsSchema: z.object({ challengeId: z.string().min(1) }),
  getWorldCupAdminState: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/bracket-brain/bracketBrainAccess", () => ({
  userHasBracketBrainAi: hasBracketBrainAiMock,
}))

vi.mock("@/lib/world-cup/worldCupAIService", () => ({
  buildWorldCupMatchupIntelligence: buildIntelMock,
}))

vi.mock("@/lib/world-cup/worldCupAiTokenFallback", () => ({
  WORLD_CUP_AI_TOKEN_RULES: {
    matchup: "world_cup_ai_matchup_analysis",
  },
  prepareWorldCupAiTokenFallback: prepareTokenFallbackMock,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketChallenge: { findUnique: prismaChallengeMock },
    worldCupBracketEntry: { findFirst: prismaEntryMock },
    worldCupBracketMatch: { findFirst: prismaMatchMock },
  },
}))

const sampleDbMatch = {
  id: "m1",
  apiFixtureId: null,
  round: "round_of_32",
  roundIndex: 1,
  matchNumber: 1,
  homeSlotKey: "A1",
  awaySlotKey: "B2",
  homeTeamId: "t1",
  awayTeamId: "t2",
  homeTeamName: "Alpha",
  awayTeamName: "Beta",
  homeTeamLogo: null,
  awayTeamLogo: null,
  homeScore: null,
  awayScore: null,
  homePenaltyScore: null,
  awayPenaltyScore: null,
  status: "scheduled",
  startsAt: null,
  winnerTeamId: null,
  winnerTeamName: null,
  nextMatchId: "m2",
  nextMatchSlot: "home",
  elapsedMinute: null,
  injuryTime: null,
  period: null,
  venueName: null,
  venueCity: null,
  apiStatusShort: null,
  lastScoreSyncedAt: null,
}

function baseIntel(overrides: Record<string, unknown> = {}) {
  return {
    matchId: "m1",
    recommendedTeamId: "t1",
    recommendedTeamName: "Alpha",
    recommendedSide: "home" as const,
    homeWinProbability: 0.6,
    awayWinProbability: 0.4,
    confidence: "medium" as const,
    upsetRisk: "medium" as const,
    keyFactors: ["a"],
    summary: "s",
    safePick: "Alpha",
    contrarianPick: "Beta",
    projectedScore: null,
    generative: false,
    safePickSide: "home" as const,
    upsetPickSide: "away" as const,
    safePickTeamName: "Alpha",
    upsetPickTeamName: "Beta",
    riskLevel: "medium" as const,
    recentFormSummary: "r",
    rankingSeedComparison: "c",
    bracketImpactIfHomeWins: "h",
    bracketImpactIfAwayWins: "a",
    whyThisPickMakesSense: "w",
    howRiskyIsThisPick: "x",
    whatThisMeansForYourBracket: "y",
    narrativesGenerative: false,
    ...overrides,
  }
}

describe("POST /api/brackets/world-cup/.../ai/matchup (AF Pro)", () => {
  beforeEach(() => {
    requireUserMock.mockReset()
    hasBracketBrainAiMock.mockReset()
    buildIntelMock.mockReset()
    prepareTokenFallbackMock.mockReset()
    commitTokenSpendMock.mockReset()
    prismaChallengeMock.mockReset()
    prismaEntryMock.mockReset()
    prismaMatchMock.mockReset()

    requireUserMock.mockResolvedValue({ ok: true, user: { id: "u1", email: "u@x.com" } })
    prismaChallengeMock.mockResolvedValue({
      id: "c1",
      ownerUserId: "u1",
      visibility: "public",
      participants: [{ id: "p1" }],
    })
    prismaEntryMock.mockResolvedValue({ id: "e1" })
    prismaMatchMock.mockResolvedValue(sampleDbMatch)
    buildIntelMock.mockResolvedValue(baseIntel())
    commitTokenSpendMock.mockResolvedValue({ id: "ledger-1", delta: -15 })
    prepareTokenFallbackMock.mockResolvedValue({
      ok: true,
      mode: "subscription",
      tokenPreview: null,
      commitTokenSpend: null,
    })
  })

  it("returns token confirmation for ask_ai when user lacks AF Pro but may have tokens", async () => {
    hasBracketBrainAiMock.mockResolvedValue(false)
    prepareTokenFallbackMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "Token spend confirmation required.",
          code: "token_confirmation_required",
          preview: { tokenCost: 15 },
        }),
        { status: 409 }
      ),
    })

    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/ai/matchup/route"
    )

    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/entries/e1/ai/matchup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: "m1", intent: "ask_ai" }),
      }),
      { params: { challengeId: "c1", entryId: "e1" } }
    )

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe("token_confirmation_required")
    expect(buildIntelMock).not.toHaveBeenCalled()
  })

  it("allows panel intent for non-Pro with deterministic intelligence payload", async () => {
    hasBracketBrainAiMock.mockResolvedValue(false)

    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/ai/matchup/route"
    )

    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/entries/e1/ai/matchup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: "m1", intent: "panel" }),
      }),
      { params: { challengeId: "c1", entryId: "e1" } }
    )

    expect(res.status).toBe(200)
    expect(buildIntelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bracketBrainAiEntitled: false,
        intent: "panel",
      })
    )
  })

  it("runs ask_ai for AF Pro users", async () => {
    hasBracketBrainAiMock.mockResolvedValue(true)

    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/ai/matchup/route"
    )

    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/entries/e1/ai/matchup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: "m1", intent: "ask_ai" }),
      }),
      { params: { challengeId: "c1", entryId: "e1" } }
    )

    expect(res.status).toBe(200)
    expect(buildIntelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bracketBrainAiEntitled: true,
        intent: "ask_ai",
      })
    )
  })

  it("runs ask_ai through token fallback and commits only after generative AI succeeds", async () => {
    hasBracketBrainAiMock.mockResolvedValue(false)
    prepareTokenFallbackMock.mockResolvedValueOnce({
      ok: true,
      mode: "tokens",
      tokenPreview: { tokenCost: 15, canSpend: true },
      commitTokenSpend: commitTokenSpendMock,
    })
    buildIntelMock.mockResolvedValueOnce(baseIntel({ generative: true }))

    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/ai/matchup/route"
    )

    const res = await POST(
      new Request("http://localhost/api/brackets/world-cup/c1/entries/e1/ai/matchup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: "m1", intent: "ask_ai", confirmTokenSpend: true }),
      }),
      { params: { challengeId: "c1", entryId: "e1" } }
    )

    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.tokenSpend).toMatchObject({ id: "ledger-1" })
    expect(commitTokenSpendMock).toHaveBeenCalledTimes(1)
    expect(buildIntelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bracketBrainAiEntitled: true,
        intent: "ask_ai",
      })
    )
  })
})

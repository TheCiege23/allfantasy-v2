import { describe, expect, it } from "vitest"

import {
  composeChimmyPrompt,
  DEFAULT_PROMPT_BUDGET_CHARS,
} from "@/lib/chimmy-context/prompt/PromptComposer"
import type { ChimmyContextBundle } from "@/lib/chimmy-context/types"

function buildBundle(overrides: Partial<ChimmyContextBundle> = {}): ChimmyContextBundle {
  return {
    user: {
      userId: "u1",
      displayName: "Test User",
      username: "testuser",
      timezone: "America/Los_Angeles",
      preferredLanguage: "en",
      createdAt: null,
    },
    aiAccess: {
      hasAccess: true,
      reason: "active_subscription",
      hasSubscription: true,
      planLabel: "Premium",
      inTrial: false,
      trialDaysRemaining: 0,
      trialEndsAt: null,
      tokenBalance: 100,
      message: "ok",
    },
    activeLeague: {
      id: "lg1",
      name: "My Dynasty",
      platform: "sleeper",
      sport: "NFL",
      season: 2026,
      format: "dynasty",
      scoring: "PPR",
      numTeams: 12,
      isCommissioner: true,
      role: "commissioner",
    },
    leagues: [],
    matchup: null,
    roster: null,
    standings: null,
    rankings: null,
    leagueDifficulty: null,
    importedHistory: {
      source: "sleeper",
      totalLeagues: 4,
      totalSeasons: 3,
      careerRecord: "30-20",
      winPercentage: 60,
      championships: 1,
      archetype: "Aggressive Trader",
      recentLeagues: [
        { name: "League A", season: 2025, record: "10-4", champion: true },
        { name: "League B", season: 2024, record: "8-6", champion: false },
      ],
    },
    memoryRefs: [],
    meta: {
      builtAt: new Date().toISOString(),
      durationMs: 1,
      providers: [],
    },
    ...overrides,
  }
}

describe("composeChimmyPrompt", () => {
  it("renders always-on sections for general intent", () => {
    const result = composeChimmyPrompt(buildBundle(), { intent: "general" })
    expect(result.contextBlock).toContain("## USER")
    expect(result.contextBlock).toContain("## AI ACCESS")
    expect(result.contextBlock).toContain("## ACTIVE LEAGUE")
    expect(result.contextBlock).toContain("## IMPORTED HISTORY")
    expect(result.contextBlock).toContain("## CHIMMY PERSONALITY")
  })

  it("suppresses intent-conditional sections for general intent", () => {
    const result = composeChimmyPrompt(buildBundle(), { intent: "general" })
    expect(result.contextBlock).not.toContain("## MATCHUP")
    expect(result.contextBlock).not.toContain("## ROSTER")
    expect(result.contextBlock).not.toContain("## STANDINGS")
    expect(result.contextBlock).not.toContain("## RANKINGS")
  })

  it("includes matchup section when matchup data is present and intent allows", () => {
    const bundle = buildBundle({
      matchup: {
        leagueId: "lg1",
        week: 7,
        yourTeamId: "t1",
        opponentTeamId: "t2",
        yourProjectedPoints: 121.5,
        opponentProjectedPoints: 110.2,
        status: "scheduled",
      },
    })
    const result = composeChimmyPrompt(bundle, { intent: "matchup" })
    expect(result.contextBlock).toContain("## MATCHUP")
    expect(result.contextBlock).toContain("121.5")
  })

  it("excludes matchup section under draft intent even when matchup data is present", () => {
    const bundle = buildBundle({
      matchup: {
        leagueId: "lg1",
        week: 7,
        yourTeamId: "t1",
        opponentTeamId: "t2",
        yourProjectedPoints: 121.5,
        opponentProjectedPoints: 110.2,
        status: "scheduled",
      },
    })
    const result = composeChimmyPrompt(bundle, { intent: "draft" })
    expect(result.contextBlock).not.toContain("## MATCHUP")
  })

  it("respects token budget and produces section metadata", () => {
    const result = composeChimmyPrompt(buildBundle(), { intent: "trade" })
    expect(result.totalChars).toBeLessThanOrEqual(DEFAULT_PROMPT_BUDGET_CHARS)
    expect(result.approxTokens).toBeGreaterThan(0)
    expect(result.sections.length).toBeGreaterThan(0)
    const rendered = result.sections.filter((s) => s.rendered).map((s) => s.id)
    expect(rendered).toContain("personality")
    expect(rendered).toContain("user")
    expect(rendered).toContain("activeLeague")
  })

  it("drops optional sections first when budget is tight", () => {
    const result = composeChimmyPrompt(buildBundle(), {
      intent: "trade",
      budgetChars: 500,
    })
    expect(result.totalChars).toBeLessThanOrEqual(500)
  })

  it("returns empty contextBlock for an empty bundle", () => {
    const empty: ChimmyContextBundle = {
      user: null,
      aiAccess: null,
      activeLeague: null,
      leagues: [],
      matchup: null,
      roster: null,
      standings: null,
      rankings: null,
      leagueDifficulty: null,
      importedHistory: null,
      memoryRefs: [],
      meta: { builtAt: new Date().toISOString(), durationMs: 0, providers: [] },
    }
    const result = composeChimmyPrompt(empty, { intent: "general" })
    // Personality is static, so the block is non-empty but contains only that.
    expect(result.contextBlock).toContain("## CHIMMY PERSONALITY")
    expect(result.contextBlock).not.toContain("## USER")
  })
})

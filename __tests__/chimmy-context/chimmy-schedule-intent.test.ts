/**
 * Tests for sports_schedule intent detection and the safe fallback guardrail
 * that prevents Chimmy from hallucinating game times / scores.
 */

import { describe, expect, it } from "vitest"

import { classifyChimmyIntent } from "@/lib/chimmy-context/intent/IntentClassifier"
import { selectProvidersForIntent } from "@/lib/chimmy-context/intent/ProviderSelector"
import { renderSportsScheduleSection } from "@/lib/chimmy-context/prompt/sections"
import { composeChimmyPrompt } from "@/lib/chimmy-context/prompt/PromptComposer"
import type { ChimmyContextBundle, SportsScheduleSlice } from "@/lib/chimmy-context/types"

// ─── Intent detection ─────────────────────────────────────────────────────────

describe("classifyChimmyIntent — sports_schedule", () => {
  it.each([
    "what games are on tonight?",
    "what games are today?",
    "who is playing right now?",
    "who plays tonight?",
    "what sports are on today?",
    "NBA games tonight",
    "NFL games today",
    "NHL matches tonight",
    "MLB games today",
    "soccer games today",
    "what time is the game?",
    "what channel is the game on?",
    "schedule today",
    "live scores now",
    "scores tonight",
    "sports calendar",
    "when does the team play?",
    "World Cup match today",
    "World Cup game tonight",
    "when do they kick off?",
  ])("classifies '%s' as sports_schedule", (message) => {
    const result = classifyChimmyIntent({ message })
    expect(result.intent).toBe("sports_schedule")
  })

  it("does NOT classify unrelated messages as sports_schedule", () => {
    const unrelated = [
      "Should I start my RB1?",
      "What's the waiver wire priority?",
      "Trade help needed",
      "Dynasty rankings",
      "Who should I draft?",
    ]
    for (const message of unrelated) {
      const result = classifyChimmyIntent({ message })
      expect(result.intent).not.toBe("sports_schedule")
    }
  })

  it("sports_schedule beats start_sit when message mixes both", () => {
    // sports_schedule is highest priority; should win on tie
    const r = classifyChimmyIntent({ message: "what games are on tonight? who should I start?" })
    expect(r.intent).toBe("sports_schedule")
  })

  it("returns confidence in [0,1]", () => {
    const r = classifyChimmyIntent({ message: "what games are on tonight?" })
    expect(r.confidence).toBeGreaterThan(0)
    expect(r.confidence).toBeLessThanOrEqual(1)
  })
})

// ─── Provider selection ────────────────────────────────────────────────────────

describe("selectProvidersForIntent — sports_schedule", () => {
  it("includes sportsSchedule provider for sports_schedule intent", () => {
    const providers = selectProvidersForIntent("sports_schedule")
    expect(providers).toContain("sportsSchedule")
  })

  it("does NOT include sportsSchedule for general intent", () => {
    const providers = selectProvidersForIntent("general")
    expect(providers).not.toContain("sportsSchedule")
  })

  it("does NOT include sportsSchedule for trade intent", () => {
    const providers = selectProvidersForIntent("trade")
    expect(providers).not.toContain("sportsSchedule")
  })

  it("always includes user + subscription for sports_schedule", () => {
    const providers = selectProvidersForIntent("sports_schedule")
    expect(providers).toContain("user")
    expect(providers).toContain("subscription")
    expect(providers).toContain("league")
  })
})

// ─── Section renderer — safe fallback guardrail ────────────────────────────────

describe("renderSportsScheduleSection — no real data", () => {
  const emptySlice: SportsScheduleSlice = {
    date: "2026-05-22",
    games: [],
    hasRealData: false,
  }

  it("renders the guardrail header", () => {
    const out = renderSportsScheduleSection(emptySlice)
    expect(out).toContain("## SPORTS SCHEDULE")
  })

  it("includes 'no live schedule data available' notice", () => {
    const out = renderSportsScheduleSection(emptySlice)
    expect(out.toLowerCase()).toContain("no live schedule data available")
  })

  it("renders the do-not-guess directive", () => {
    const out = renderSportsScheduleSection(emptySlice)
    expect(out).toContain("Do NOT guess")
  })

  it("renders the only-answer-using-provided-context guardrail", () => {
    const out = renderSportsScheduleSection(emptySlice)
    expect(out).toContain("Only answer using provided schedule context")
  })

  it("renders the suggested fallback phrase for Chimmy", () => {
    const out = renderSportsScheduleSection(emptySlice)
    expect(out).toContain("I need live schedule data connected before I can answer")
  })

  it("returns empty string for null input", () => {
    expect(renderSportsScheduleSection(null)).toBe("")
  })
})

describe("renderSportsScheduleSection — with real data", () => {
  const liveSlice: SportsScheduleSlice = {
    date: "2026-05-22",
    hasRealData: true,
    games: [
      {
        sport: "NBA",
        homeTeam: "Boston Celtics",
        awayTeam: "Miami Heat",
        startTime: "7:30 PM ET",
        status: "scheduled",
        homeScore: null,
        awayScore: null,
      },
      {
        sport: "NHL",
        homeTeam: "Tampa Bay Lightning",
        awayTeam: "Florida Panthers",
        startTime: "8:00 PM ET",
        status: "in_progress",
        homeScore: 2,
        awayScore: 3,
      },
    ],
  }

  it("renders the schedule header", () => {
    const out = renderSportsScheduleSection(liveSlice)
    expect(out).toContain("## SPORTS SCHEDULE")
  })

  it("includes game details for both games", () => {
    const out = renderSportsScheduleSection(liveSlice)
    expect(out).toContain("Celtics")
    expect(out).toContain("Panthers")
  })

  it("includes the sport label", () => {
    const out = renderSportsScheduleSection(liveSlice)
    expect(out).toContain("[NBA]")
    expect(out).toContain("[NHL]")
  })

  it("includes the game status", () => {
    const out = renderSportsScheduleSection(liveSlice)
    expect(out).toContain("in_progress")
  })

  it("does NOT include the guardrail when real data is present", () => {
    const out = renderSportsScheduleSection(liveSlice)
    expect(out).not.toContain("Do NOT guess")
    expect(out).not.toContain("I need live schedule data connected")
  })
})

// ─── PromptComposer integration ───────────────────────────────────────────────

function buildMinimalBundle(overrides: Partial<ChimmyContextBundle> = {}): ChimmyContextBundle {
  return {
    user: {
      userId: "u1",
      displayName: "Test",
      username: "test",
      timezone: "America/New_York",
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
      tokenBalance: 50,
      message: "ok",
    },
    activeLeague: null,
    leagues: [],
    matchup: null,
    roster: null,
    standings: null,
    rankings: null,
    leagueDifficulty: null,
    importedHistory: null,
    sportsSchedule: null,
    memoryRefs: [],
    meta: { builtAt: new Date().toISOString(), durationMs: 1, providers: [] },
    ...overrides,
  }
}

describe("composeChimmyPrompt — sports_schedule intent", () => {
  it("includes SPORTS SCHEDULE section when intent is sports_schedule and data present", () => {
    const bundle = buildMinimalBundle({
      sportsSchedule: {
        date: "2026-05-22",
        hasRealData: true,
        games: [
          {
            sport: "NBA",
            homeTeam: "Celtics",
            awayTeam: "Heat",
            startTime: "7:30 PM ET",
            status: "scheduled",
            homeScore: null,
            awayScore: null,
          },
        ],
      },
    })
    const result = composeChimmyPrompt(bundle, { intent: "sports_schedule" })
    expect(result.contextBlock).toContain("## SPORTS SCHEDULE")
    expect(result.contextBlock).toContain("NBA")
    expect(result.contextBlock).toContain("Celtics")
  })

  it("includes guardrail block when hasRealData is false", () => {
    const bundle = buildMinimalBundle({
      sportsSchedule: {
        date: "2026-05-22",
        hasRealData: false,
        games: [],
      },
    })
    const result = composeChimmyPrompt(bundle, { intent: "sports_schedule" })
    expect(result.contextBlock).toContain("## SPORTS SCHEDULE")
    expect(result.contextBlock).toContain("Only answer using provided schedule context")
  })

  it("suppresses SPORTS SCHEDULE for general intent", () => {
    const bundle = buildMinimalBundle({
      sportsSchedule: {
        date: "2026-05-22",
        hasRealData: true,
        games: [],
      },
    })
    const result = composeChimmyPrompt(bundle, { intent: "general" })
    expect(result.contextBlock).not.toContain("## SPORTS SCHEDULE")
  })

  it("suppresses SPORTS SCHEDULE for trade intent", () => {
    const bundle = buildMinimalBundle({
      sportsSchedule: {
        date: "2026-05-22",
        hasRealData: true,
        games: [],
      },
    })
    const result = composeChimmyPrompt(bundle, { intent: "trade" })
    expect(result.contextBlock).not.toContain("## SPORTS SCHEDULE")
  })
})

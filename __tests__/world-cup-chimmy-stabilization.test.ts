import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_WORLD_CUP_SCORING } from "@/lib/world-cup/worldCupBracketBuilder"
import type { WorldCupChimmyContext } from "@/lib/world-cup/worldCupChimmyContext"
import {
  buildWorldCupChimmySystemPrompt,
  enforceWorldCupChimmyReplyGuard,
  isBracketImpactQuestion,
  isPoolStandingQuestion,
  isScoringExplanationQuestion,
  serializeChimmyContext,
  tryDeterministicWorldCupChimmyReply,
} from "@/lib/world-cup/worldCupChimmyReplyPolicy"

const routeTextCallMock = vi.hoisted(() => vi.fn())
const appendChatHistoryMock = vi.hoisted(() => vi.fn())
const buildChimmyConversationIdMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))

vi.mock("@/lib/ai/providerRouter", () => ({
  routeTextCall: routeTextCallMock,
}))

vi.mock("@/lib/ai-memory/chat-history-store", () => ({
  appendChatHistory: appendChatHistoryMock,
  buildChimmyConversationId: buildChimmyConversationIdMock,
}))

function baseContext(overrides: Partial<WorldCupChimmyContext> = {}): WorldCupChimmyContext {
  return {
    challengeId: "c1",
    poolName: "Office Cup",
    isLocked: false,
    lockReason: null,
    participantCount: 8,
    scoring: { ...DEFAULT_WORLD_CUP_SCORING },
    entry: {
      entryId: "e1",
      entryName: "Guap Bracket",
      championPick: "Brazil",
      totalScore: 120,
      maxPossibleScore: 400,
      rank: 2,
      correctPicks: 8,
      incorrectPicks: 2,
      isComplete: false,
      isLocked: false,
      groupPicks: [],
      knockoutPicks: [
        {
          round: "round_of_16",
          homeTeamName: "Argentina",
          awayTeamName: "France",
          pickedTeam: "Argentina",
          isCorrect: null,
          pointsAwarded: 0,
        },
      ],
    },
    liveMatches: [],
    upcomingMatches: [],
    recentMatches: [],
    groupStandings: [],
    leaderboard: [
      {
        rank: 1,
        entryId: "e0",
        entryName: "Leader",
        userId: "u0",
        totalScore: 140,
        maxPossibleScore: 400,
        championPickName: "Spain",
      },
      {
        rank: 2,
        entryId: "e1",
        entryName: "Guap Bracket",
        userId: "u1",
        totalScore: 120,
        maxPossibleScore: 400,
        championPickName: "Brazil",
      },
    ],
    liveDataStatus: "unavailable",
    lastSyncedAt: null,
    locale: "en",
    fetchedAt: "2026-06-15T18:00:00.000Z",
    ...overrides,
  }
}

describe("World Cup Chimmy reply policy", () => {
  it("system prompt is pool-scoped and forbids inventing live data", () => {
    const prompt = buildWorldCupChimmySystemPrompt("en")
    expect(prompt).toMatch(/bracket pool analyst/i)
    expect(prompt).toMatch(/Never invent scores/i)
    expect(prompt).toMatch(/NOT in scope: general sports chat/i)
  })

  it("serializes leaderboard and scoring for pool standing questions", () => {
    const block = serializeChimmyContext(baseContext())
    expect(block).toContain("LEADERBOARD")
    expect(block).toContain("SCORING:")
    expect(block).toContain("YOUR ENTRY:")
    expect(isPoolStandingQuestion("who is leading the pool?")).toBe(true)
  })

  it("detects bracket impact and scoring explanation intents", () => {
    expect(isBracketImpactQuestion("if Argentina wins, how does that affect my bracket?")).toBe(true)
    expect(isScoringExplanationQuestion("how do quarterfinal points work?")).toBe(true)
  })
})

describe("generateWorldCupChimmyPrivateReply — stabilization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    buildChimmyConversationIdMock.mockReturnValue("chimmy:user-1:world-cup:c1")
    appendChatHistoryMock.mockResolvedValue(undefined)
    routeTextCallMock.mockResolvedValue({
      ok: true,
      text: "Placeholder",
      model: "gpt-test",
      provider: "openai",
      tokensUsed: 10,
    })
  })

  async function replyWith(input: {
    prompt: string
    locale?: string | null
    context?: WorldCupChimmyContext | null
  }) {
    const { generateWorldCupChimmyPrivateReply } = await import("@/lib/world-cup/worldCupChimmyPrivateReply")
    return generateWorldCupChimmyPrivateReply({
      userId: "user-1",
      challengeId: "c1",
      challengeName: "Office Cup",
      prompt: input.prompt,
      locale: input.locale ?? "en",
      context: input.context ?? baseContext(),
    })
  }

  it("score question with live data — keeps feed-backed score", async () => {
    routeTextCallMock.mockResolvedValue({
      ok: true,
      text: "Argentina lead 2-1 (67') in your pool feed — that keeps your R16 pick alive.",
      model: "gpt-test",
      provider: "openai",
      tokensUsed: 10,
    })

    const result = await replyWith({
      prompt: "@chimmy what's the live score for Argentina?",
      context: baseContext({
        liveDataStatus: "live",
        liveMatches: [
          {
            matchId: "m1",
            round: "round_of_16",
            homeTeamName: "Argentina",
            awayTeamName: "France",
            homeScore: 2,
            awayScore: 1,
            homePenaltyScore: null,
            awayPenaltyScore: null,
            winnerTeamName: null,
            status: "live",
            minute: 67,
            injuryTime: null,
            startsAt: "2026-06-15T20:00:00.000Z",
            venueName: null,
            venueCity: null,
            apiStatusShort: "LIVE",
            lastSyncedAt: "2026-06-15T20:30:00.000Z",
          },
        ],
      }),
    })

    expect(routeTextCallMock).toHaveBeenCalled()
    expect(result.reply).toMatch(/2-1/)
    expect(result.reply).not.toMatch(/live feed isn't synced/i)
  })

  it("score question without live data — deterministic unavailable message", async () => {
    const result = await replyWith({
      prompt: "@chimmy what's the live score right now?",
      context: baseContext({ liveDataStatus: "unavailable", liveMatches: [] }),
    })

    expect(routeTextCallMock).not.toHaveBeenCalled()
    expect(result.provider).toBe("deterministic")
    expect(result.reply).toMatch(/live score feed/i)
    expect(result.reply).not.toMatch(/\b\d{1,2}-\d{1,2}\b/)
  })

  it("pool standing question — includes leaderboard in model context", async () => {
    routeTextCallMock.mockResolvedValue({
      ok: true,
      text: "You're #2 on 120pts — Leader has 140pts at the top.",
      model: "gpt-test",
      provider: "openai",
      tokensUsed: 10,
    })

    await replyWith({ prompt: "@chimmy where am I on the leaderboard?" })

    const userMessage = routeTextCallMock.mock.calls[0]?.[0]?.messages?.[1]?.content as string
    expect(userMessage).toContain("LEADERBOARD")
    expect(userMessage).toContain("120pts")
  })

  it("bracket impact question — includes picks alive in model context", async () => {
    await replyWith({ prompt: "@chimmy if Argentina wins, how does that affect my bracket?" })

    const userMessage = routeTextCallMock.mock.calls[0]?.[0]?.messages?.[1]?.content as string
    expect(userMessage).toContain("PICKS ALIVE")
    expect(userMessage).toContain("Argentina")
  })

  it("scoring explanation — includes scoring rules in model context", async () => {
    await replyWith({ prompt: "@chimmy how do quarterfinal points work in this pool?" })

    const userMessage = routeTextCallMock.mock.calls[0]?.[0]?.messages?.[1]?.content as string
    expect(userMessage).toContain("SCORING:")
    expect(userMessage).toContain("QF=40")
  })

  it("Spanish response when locale is Spanish", async () => {
    const deterministic = tryDeterministicWorldCupChimmyReply({
      prompt: "marcador en vivo?",
      context: baseContext({ liveDataStatus: "unavailable" }),
      locale: "es",
    })
    expect(deterministic).toMatch(/marcador en vivo/i)

    const result = await replyWith({
      prompt: "@chimmy marcador en vivo?",
      locale: "es",
      context: baseContext({ liveDataStatus: "unavailable" }),
    })
    expect(result.reply).toMatch(/marcador en vivo|datos en vivo/i)
    expect(routeTextCallMock).not.toHaveBeenCalled()

    const system = buildWorldCupChimmySystemPrompt("es")
    expect(system).toContain("Respond in Spanish")
  })

  it("hallucination guard — blocks invented score when live data missing", async () => {
    routeTextCallMock.mockResolvedValue({
      ok: true,
      text: "Brazil are up 3-2 in the 78th minute!",
      model: "gpt-test",
      provider: "openai",
      tokensUsed: 10,
    })

    const guarded = enforceWorldCupChimmyReplyGuard({
      reply: "Brazil are up 3-2 in the 78th minute!",
      prompt: "any update on Brazil?",
      context: baseContext({ liveDataStatus: "unavailable" }),
      locale: "en",
    })
    expect(guarded).not.toMatch(/3-2/)
    expect(guarded).toMatch(/won't guess|live score feed/i)

    const result = await replyWith({
      prompt: "@chimmy score for Brazil?",
      context: baseContext({ liveDataStatus: "unavailable" }),
    })
    expect(result.reply).not.toMatch(/3-2/)
  })
})

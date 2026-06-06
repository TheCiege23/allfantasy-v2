import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_WORLD_CUP_SCORING } from "@/lib/world-cup/worldCupBracketBuilder"
import type { WorldCupChimmyContext } from "@/lib/world-cup/worldCupChimmyContext"

const routeTextCallMock = vi.hoisted(() => vi.fn())
const appendChatHistoryMock = vi.hoisted(() => vi.fn())
const buildChimmyConversationIdMock = vi.hoisted(() => vi.fn())
const tryDeterministicAnswerMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))

vi.mock("@/lib/ai/providerRouter", () => ({
  routeTextCall: routeTextCallMock,
}))

vi.mock("@/lib/ai/deterministic", () => ({
  DETERMINISTIC_SOURCE: "deterministic",
  tryDeterministicAnswer: tryDeterministicAnswerMock,
}))

vi.mock("@/lib/ai-memory/chat-history-store", () => ({
  appendChatHistory: appendChatHistoryMock,
  buildChimmyConversationId: buildChimmyConversationIdMock,
}))

function context(): WorldCupChimmyContext {
  return {
    challengeId: "wc-1",
    poolName: "Office Cup",
    isLocked: false,
    lockReason: null,
    participantCount: 8,
    entryCount: 8,
    finalizedEntryCount: 6,
    inviteCount: 3,
    scoring: { ...DEFAULT_WORLD_CUP_SCORING },
    userRole: "participant",
    commissionerSettings: null,
    entry: null,
    liveMatches: [],
    upcomingMatches: [],
    recentMatches: [],
    groupStandings: [],
    leaderboard: [],
    liveDataStatus: "unavailable",
    lastSyncedAt: null,
    locale: "en",
    fetchedAt: "2026-06-05T13:00:00.000Z",
  }
}

describe("World Cup Chimmy token/no-charge policy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appendChatHistoryMock.mockResolvedValue(undefined)
    buildChimmyConversationIdMock.mockReturnValue("chimmy:user-1:world-cup:wc-1")
    tryDeterministicAnswerMock.mockResolvedValue(null)
    routeTextCallMock.mockResolvedValue({
      ok: true,
      text: "Grounded answer.",
      provider: "openai",
      model: "gpt-test",
      tokensUsed: 12,
    })
  })

  it("does not call the provider when grounding context is missing", async () => {
    const { generateWorldCupChimmyPrivateReply } = await import("@/lib/world-cup/worldCupChimmyPrivateReply")

    const result = await generateWorldCupChimmyPrivateReply({
      userId: "user-1",
      challengeId: "wc-1",
      prompt: "Give me an advanced upset simulation",
      context: null,
      locale: "en",
    })

    expect(routeTextCallMock).not.toHaveBeenCalled()
    expect(result.provider).toBe("unavailable")
    expect(result.reply).toContain("No tokens should be charged")
  })

  it("does not call the provider for unsupported injuries or odds", async () => {
    const { generateWorldCupChimmyPrivateReply } = await import("@/lib/world-cup/worldCupChimmyPrivateReply")

    const result = await generateWorldCupChimmyPrivateReply({
      userId: "user-1",
      challengeId: "wc-1",
      prompt: "Who is injured and what are the odds?",
      context: context(),
      locale: "en",
    })

    expect(routeTextCallMock).not.toHaveBeenCalled()
    expect(result.reply).toContain("I don't have reliable data for that yet")
    expect(result.grounding.dataQuality.noChargeReason).toBeTruthy()
  })
})

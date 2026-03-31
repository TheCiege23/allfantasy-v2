import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const createMessageMock = vi.fn()

vi.mock('server-only', () => ({}))

class MockAnthropicApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    static APIError = MockAnthropicApiError

    messages = {
      create: createMessageMock,
    }

    constructor(_: unknown) {}
  }

  return {
    default: MockAnthropic,
  }
})

describe("Anthropic Chimmy pipeline", () => {
  const originalAnthropicApiKey = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    vi.resetModules()
    createMessageMock.mockReset()
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key"
  })

  afterEach(() => {
    if (originalAnthropicApiKey == null) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = originalAnthropicApiKey
    }
  })

  it("falls back to a general-response path when classifier output is not valid JSON", async () => {
    createMessageMock
      .mockResolvedValueOnce({
        model: "claude-sonnet-4-6",
        content: [{ type: "text", text: "definitely not json" }],
        usage: { input_tokens: 12, output_tokens: 8 },
      })
      .mockResolvedValueOnce({
        model: "claude-haiku-4-5-20251001",
        content: [{ type: "text", text: "General fallback answer." }],
        usage: { input_tokens: 6, output_tokens: 4 },
      })

    const { runAgentPipeline } = await import("@/lib/agents/anthropic-pipeline")
    const result = await runAgentPipeline("Give me a longer strategic answer about this roster", {
      userId: "user-1",
      tier: "pro",
      sport: "NFL",
      leagueFormat: "dynasty",
      scoring: "PPR",
    })

    expect(createMessageMock).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      result: "General fallback answer.",
      intent: "general",
      model: "claude-haiku-4-5-20251001",
      tokensUsed: 30,
    })
  })

  it("marks pro-only intents as upgrade required for free users without running a specialist", async () => {
    createMessageMock.mockResolvedValueOnce({
      model: "claude-sonnet-4-6",
      content: [
        {
          type: "text",
          text: JSON.stringify({
            intent: "waiver_wire",
            isQuickAsk: false,
            payload: {
              sport: "NFL",
              format: "redraft",
              scoring: "PPR",
              userMessage: "Who should I add this week?",
            },
          }),
        },
      ],
      usage: { input_tokens: 15, output_tokens: 5 },
    })

    const { runAgentPipeline } = await import("@/lib/agents/anthropic-pipeline")
    const result = await runAgentPipeline("Who should I add from waivers this week in my league?", {
      userId: "user-2",
      tier: "free",
      sport: "NFL",
      leagueFormat: "redraft",
      scoring: "PPR",
    })

    expect(createMessageMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      result:
        "This is a premium feature. Upgrade to AF Pro or AF Supreme to unlock full trade analysis, waiver recommendations, draft assistance, and more.",
      intent: "waiver_wire",
      model: "claude-haiku-4-5-20251001",
      tokensUsed: 0,
      upgradeRequired: true,
      upgradePath: "/pricing",
    })
  })

  it("routes meta insights intents to the specialist prompt path", async () => {
    createMessageMock
      .mockResolvedValueOnce({
        model: "claude-sonnet-4-6",
        content: [
          {
            type: "text",
            text: JSON.stringify({
              intent: "meta_insights",
              isQuickAsk: false,
              payload: {
                sport: "NFL",
                format: "dynasty",
                insight_type: "trending_now",
                scope: "platform_wide",
                userMessage: "What strategy trends are changing right now?",
              },
            }),
          },
        ],
        usage: { input_tokens: 14, output_tokens: 6 },
      })
      .mockResolvedValueOnce({
        model: "claude-sonnet-4-6",
        content: [{ type: "text", text: "Meta insight answer." }],
        usage: { input_tokens: 18, output_tokens: 12 },
      })

    const { runAgentPipeline } = await import("@/lib/agents/anthropic-pipeline")
    const result = await runAgentPipeline(
      "What strategy trends are changing right now across dynasty leagues?",
      {
        userId: "user-3",
        tier: "pro",
        sport: "NFL",
        leagueFormat: "dynasty",
        scoring: "PPR",
      }
    )

    expect(createMessageMock).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      result: "Meta insight answer.",
      intent: "meta_insights",
      model: "claude-sonnet-4-6",
      tokensUsed: 50,
    })
  })

  it("passes uploaded images to Claude as base64 image content blocks", async () => {
    createMessageMock
      .mockResolvedValueOnce({
        model: "claude-sonnet-4-6",
        content: [
          {
            type: "text",
            text: JSON.stringify({
              intent: "quick_ask",
              isQuickAsk: true,
              payload: {
                userMessage: "Analyze this screenshot",
              },
            }),
          },
        ],
        usage: { input_tokens: 11, output_tokens: 7 },
      })
      .mockResolvedValueOnce({
        model: "claude-haiku-4-5-20251001",
        content: [{ type: "text", text: "Claude image analysis result." }],
        usage: { input_tokens: 14, output_tokens: 9 },
      })

    const { runAgentPipeline } = await import("@/lib/agents/anthropic-pipeline")
    const result = await runAgentPipeline("Analyze this screenshot", {
      userId: "user-image-1",
      tier: "pro",
      sport: "NFL",
      leagueFormat: "redraft",
      scoring: "PPR",
      image: {
        data: "aW1hZ2UtYnl0ZXM=",
        mediaType: "image/png",
        name: "trade.png",
      },
    })

    expect(createMessageMock).toHaveBeenCalledTimes(2)
    expect(createMessageMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              expect.objectContaining({ type: "text" }),
              expect.objectContaining({
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: "aW1hZ2UtYnl0ZXM=",
                },
              }),
            ]),
          }),
        ],
      })
    )
    expect(createMessageMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              expect.objectContaining({ type: "text" }),
              expect.objectContaining({
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: "aW1hZ2UtYnl0ZXM=",
                },
              }),
            ]),
          }),
        ],
      })
    )
    expect(result).toEqual({
      result: "Claude image analysis result.",
      intent: "quick_ask",
      model: "claude-haiku-4-5-20251001",
      tokensUsed: 41,
    })
  })
})

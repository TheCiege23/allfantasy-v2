import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}))

vi.mock("openai", () => ({
  default: class MockOpenAI {
    apiKey = "test-key"
    chat = {
      completions: {
        create: mockCreate,
      },
    }
  },
}))

import { summarizeHeadlines } from "@/lib/fantasy-news-aggregator/NewsSummarizerAI"

describe("NewsSummarizerAI", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty object for empty input", async () => {
    const result = await summarizeHeadlines([])
    expect(result).toEqual({})
  })

  it("uses AI output lines in item order", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              "AI: workload spike expected\nAI: starting role change confirmed",
          },
        },
      ],
    })

    const items = [
      { id: "n1", title: "Player workload expected to increase in Week 6" },
      { id: "n2", title: "Team confirms starting role change for red-zone package" },
    ]

    const result = await summarizeHeadlines(items)
    expect(result).toEqual({
      n1: "AI: workload spike expected",
      n2: "AI: starting role change confirmed",
    })
  })

  it("falls back to original headlines when AI call fails", async () => {
    mockCreate.mockRejectedValue(new Error("service unavailable"))
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const items = [
      { id: "n1", title: "Player workload expected to increase in Week 6" },
      { id: "n2", title: "Team confirms starting role change for red-zone package" },
    ]

    const result = await summarizeHeadlines(items)
    expect(result).toEqual({
      n1: "Player workload expected to increase in Week 6",
      n2: "Team confirms starting role change for red-zone package",
    })
    consoleSpy.mockRestore()
  })
})

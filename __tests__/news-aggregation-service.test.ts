import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sportsNews: {
      findMany: mockFindMany,
    },
  },
}))

import { getPlayerNewsFeed, getTeamNewsFeed } from "@/lib/fantasy-news-aggregator/NewsAggregationService"

describe("NewsAggregationService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("builds player feed and preserves article source links", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "n1",
        title: "QB workload rising",
        description: "Coach confirms more volume.",
        source: "ESPN",
        sourceUrl: "https://example.com/article-1",
        author: null,
        imageUrl: null,
        team: "BUF",
        teams: ["BUF"],
        playerName: "Josh Allen",
        playerNames: ["Josh Allen"],
        category: "performance",
        sentiment: null,
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ])

    const items = await getPlayerNewsFeed("Josh Allen", 10, { sport: "soccer" })

    expect(items).toHaveLength(1)
    expect(items[0]?.sourceUrl).toBe("https://example.com/article-1")
    expect(items[0]?.playerName).toBe("Josh Allen")
    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockFindMany.mock.calls[0]?.[0]?.where?.sport).toBe("SOCCER")
  })

  it("builds team feed using normalized team query", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "n2",
        title: "Depth chart update",
        description: "New rotation for red zone package.",
        source: "TeamWire",
        sourceUrl: "https://example.com/article-2",
        author: null,
        imageUrl: null,
        team: "KC",
        teams: ["KC"],
        playerName: null,
        playerNames: [],
        category: "roster",
        sentiment: null,
        publishedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ])

    const items = await getTeamNewsFeed("kc", 10, { sport: "NFL" })

    expect(items).toHaveLength(1)
    expect(items[0]?.sourceUrl).toBe("https://example.com/article-2")
    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockFindMany.mock.calls[0]?.[0]?.where?.OR).toEqual(
      expect.arrayContaining([expect.objectContaining({ team: "KC" })])
    )
  })
})

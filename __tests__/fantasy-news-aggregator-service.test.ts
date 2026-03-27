import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockGetNewsFeedBySport,
  mockGetPlayerNewsFeed,
  mockGetTeamNewsFeed,
  mockClassifyNewsType,
  mockSummarizeStorylineImpact,
  mockExplainFantasyImpact,
} = vi.hoisted(() => ({
  mockGetNewsFeedBySport: vi.fn(),
  mockGetPlayerNewsFeed: vi.fn(),
  mockGetTeamNewsFeed: vi.fn(),
  mockClassifyNewsType: vi.fn(),
  mockSummarizeStorylineImpact: vi.fn(),
  mockExplainFantasyImpact: vi.fn(),
}))

vi.mock("@/lib/fantasy-news-aggregator/NewsAggregationService", () => ({
  getNewsFeedBySport: mockGetNewsFeedBySport,
  getPlayerNewsFeed: mockGetPlayerNewsFeed,
  getTeamNewsFeed: mockGetTeamNewsFeed,
}))

vi.mock("@/lib/provider-config", () => ({
  isDeepSeekAvailable: () => false,
  isXaiAvailable: () => false,
  isOpenAIAvailable: () => false,
}))

vi.mock("@/lib/fantasy-news-aggregator/NewsClassificationAI", () => ({
  classifyNewsType: mockClassifyNewsType,
}))

vi.mock("@/lib/fantasy-news-aggregator/NewsStorylineAI", () => ({
  summarizeStorylineImpact: mockSummarizeStorylineImpact,
}))

vi.mock("@/lib/fantasy-news-aggregator/NewsFantasyImpactAI", () => ({
  explainFantasyImpact: mockExplainFantasyImpact,
}))

import {
  fetchAndPrepareNews,
  getEnrichedNewsFeed,
} from "@/lib/fantasy-news-aggregator/FantasyNewsAggregatorService"
import type { NewsFeedItem } from "@/lib/fantasy-news-aggregator/types"

function buildItem(overrides: Partial<NewsFeedItem> = {}): NewsFeedItem {
  return {
    id: "news-1",
    title: "Josh Allen expected to start",
    description: "Buffalo QB should handle full workload this week.",
    source: "ESPN",
    sourceUrl: "https://example.com/a",
    author: null,
    imageUrl: null,
    team: "BUF",
    teams: ["BUF"],
    playerName: null,
    playerNames: [],
    category: "injury",
    sentiment: null,
    publishedAt: "2026-03-20T10:00:00.000Z",
    sport: "NFL",
    ...overrides,
  }
}

describe("FantasyNewsAggregatorService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNewsFeedBySport.mockResolvedValue([])
    mockGetPlayerNewsFeed.mockResolvedValue([])
    mockGetTeamNewsFeed.mockResolvedValue([])
    mockClassifyNewsType.mockResolvedValue("other")
    mockSummarizeStorylineImpact.mockResolvedValue(null)
    mockExplainFantasyImpact.mockResolvedValue({ text: null, confidence: "low" })
  })

  it("deduplicates duplicate stories by source URL", async () => {
    mockGetNewsFeedBySport.mockResolvedValue([
      buildItem({ id: "news-1", sourceUrl: "https://example.com/a#fragment" }),
      buildItem({ id: "news-2", sourceUrl: "https://example.com/a" }),
      buildItem({ id: "news-3", sourceUrl: "https://example.com/b" }),
    ])

    const items = await fetchAndPrepareNews({ sport: "NFL", feedType: "sport", limit: 10 })

    expect(items).toHaveLength(2)
    expect(items.map((item) => item.id)).toEqual(["news-1", "news-3"])
  })

  it("routes player/team feed requests correctly", async () => {
    mockGetPlayerNewsFeed.mockResolvedValue([buildItem({ id: "player-news" })])
    mockGetTeamNewsFeed.mockResolvedValue([buildItem({ id: "team-news", team: "KC", teams: ["KC"] })])

    const playerItems = await fetchAndPrepareNews({
      sport: "NFL",
      feedType: "player",
      playerQuery: "Josh Allen",
      limit: 8,
    })
    const teamItems = await fetchAndPrepareNews({
      sport: "NFL",
      feedType: "team",
      teamQuery: "KC",
      limit: 8,
    })

    expect(playerItems[0]?.id).toBe("player-news")
    expect(teamItems[0]?.id).toBe("team-news")
    expect(mockGetPlayerNewsFeed).toHaveBeenCalledWith("Josh Allen", 8, expect.any(Object))
    expect(mockGetTeamNewsFeed).toHaveBeenCalledWith("KC", 8, expect.any(Object))
  })

  it("returns enriched output shape without AI providers", async () => {
    mockGetNewsFeedBySport.mockResolvedValue([
      buildItem({
        id: "news-1",
        title: "Josh Allen activated from injury report",
        description: "The Bills QB was activated and is expected to start.",
      }),
    ])

    const items = await getEnrichedNewsFeed({
      sport: "NFL",
      feedType: "sport",
      enrich: false,
      limit: 5,
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.headline).toContain("Josh Allen")
    expect(items[0]?.summary).toBeTruthy()
    expect(items[0]?.fantasyImpact).toBeTruthy()
    expect(items[0]?.confidenceLevel).toMatch(/high|medium|low/)
    expect(items[0]?.importanceScore).toBeGreaterThan(0)
    expect(items[0]?.playersMentioned).toContain("Josh Allen")
  })
})

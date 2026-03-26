import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockFindFirst, mockCreate } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fantasyMediaEpisode: {
      findFirst: mockFindFirst,
    },
    fantasyMediaPublishLog: {
      create: mockCreate,
    },
  },
}))

import {
  publishFantasyMediaEpisode,
  getFantasyMediaPublishLogs,
} from "@/lib/fantasy-media/FantasyMediaPublishService"

describe("FantasyMediaPublishService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.FANTASY_MEDIA_PUBLISH_ENABLED
    delete process.env.X_PUBLISH_ACCESS_TOKEN
    delete process.env.X_PUBLISH_API_KEY
    delete process.env.YOUTUBE_PUBLISH_ACCESS_TOKEN
    delete process.env.YOUTUBE_PUBLISH_REFRESH_TOKEN
    delete process.env.YOUTUBE_PUBLISH_CLIENT_ID
    delete process.env.YOUTUBE_PUBLISH_CLIENT_SECRET
    delete process.env.SOCIAL_PUBLISH_TOKEN
  })

  it("returns failed when destination is unsupported", async () => {
    mockCreate.mockResolvedValue({ id: "log-unsupported" })

    const result = await publishFantasyMediaEpisode("episode-1", "unknown", "user-1")
    expect(result).toEqual({
      destinationType: "unknown",
      status: "failed",
      publishId: "log-unsupported",
      message: "Unsupported publish destination",
    })
  })

  it("returns provider_unavailable for completed episode when provider disabled", async () => {
    mockFindFirst.mockResolvedValue({
      id: "episode-1",
      userId: "user-1",
      status: "completed",
      playbackUrl: "https://cdn.example.com/video.mp4",
    })
    mockCreate.mockResolvedValue({ id: "log-provider-off" })

    const result = await publishFantasyMediaEpisode("episode-1", "x", "user-1")
    expect(result.status).toBe("provider_unavailable")
    expect(result.publishId).toBe("log-provider-off")
  })

  it("returns provider_unavailable when provider is enabled but destination adapter is not configured", async () => {
    process.env.FANTASY_MEDIA_PUBLISH_ENABLED = "true"
    mockFindFirst.mockResolvedValue({
      id: "episode-1",
      userId: "user-1",
      status: "completed",
      playbackUrl: "https://cdn.example.com/video.mp4",
    })
    mockCreate.mockResolvedValue({ id: "log-provider-missing" })

    const result = await publishFantasyMediaEpisode("episode-1", "youtube", "user-1")
    expect(result).toEqual({
      destinationType: "youtube",
      status: "provider_unavailable",
      publishId: "log-provider-missing",
      message: "Publishing provider credentials are not configured",
    })
  })

  it("returns pending when provider adapter is enabled and configured", async () => {
    process.env.FANTASY_MEDIA_PUBLISH_ENABLED = "true"
    process.env.SOCIAL_PUBLISH_TOKEN = "social-token"
    mockFindFirst.mockResolvedValue({
      id: "episode-1",
      userId: "user-1",
      status: "completed",
      playbackUrl: "https://cdn.example.com/video.mp4",
    })
    mockCreate.mockResolvedValue({ id: "log-pending" })

    const result = await publishFantasyMediaEpisode("episode-1", "instagram", "user-1")
    expect(result).toEqual({
      destinationType: "instagram",
      status: "pending",
      publishId: "log-pending",
      message: "Social publish queued",
    })
  })

  it("returns logs for owned episode", async () => {
    mockFindFirst.mockResolvedValue({
      id: "episode-1",
      publishLogs: [{ id: "log-1", destinationType: "x", status: "pending" }],
    })

    const logs = await getFantasyMediaPublishLogs("episode-1", "user-1")
    expect(logs).toEqual([{ id: "log-1", destinationType: "x", status: "pending" }])
  })
})

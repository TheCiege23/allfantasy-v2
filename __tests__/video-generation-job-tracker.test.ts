import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockFindUnique, mockUpdate, mockGetHeyGenVideoStatus } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockGetHeyGenVideoStatus: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fantasyMediaEpisode: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}))

vi.mock("@/lib/fantasy-media/HeyGenVideoService", () => ({
  getHeyGenVideoStatus: mockGetHeyGenVideoStatus,
}))

import {
  refreshVideoJobStatus,
  trackVideoJob,
} from "@/lib/fantasy-media/VideoGenerationJobTracker"

describe("VideoGenerationJobTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue({
      id: "episode-1",
      provider: "heygen",
      providerJobId: "job-1",
      status: "generating",
      playbackUrl: null,
      meta: null,
    })
    mockUpdate.mockResolvedValue({})
  })

  it("marks episode completed when HeyGen returns completed", async () => {
    mockGetHeyGenVideoStatus.mockResolvedValue({
      videoId: "job-1",
      status: "completed",
      videoUrl: "https://cdn.example.com/job-1.mp4",
      thumbnailUrl: "https://cdn.example.com/job-1.jpg",
      error: null,
      duration: 129,
    })

    const result = await refreshVideoJobStatus("episode-1")
    expect(result).toEqual({
      playbackUrl: "https://cdn.example.com/job-1.mp4",
      status: "completed",
    })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("marks episode failed when HeyGen returns failed", async () => {
    mockGetHeyGenVideoStatus.mockResolvedValue({
      videoId: "job-1",
      status: "failed",
      videoUrl: null,
      thumbnailUrl: null,
      error: { message: "provider failed" },
      duration: undefined,
    })

    const result = await refreshVideoJobStatus("episode-1")
    expect(result).toEqual({ playbackUrl: null, status: "failed" })
    expect(mockUpdate).toHaveBeenCalled()
  })

  it("trackVideoJob exits once terminal status is reached", async () => {
    mockGetHeyGenVideoStatus.mockResolvedValue({
      videoId: "job-1",
      status: "completed",
      videoUrl: "https://cdn.example.com/job-1.mp4",
      thumbnailUrl: null,
      error: null,
      duration: 98,
    })

    const result = await trackVideoJob("episode-1")
    expect(result).toEqual({
      playbackUrl: "https://cdn.example.com/job-1.mp4",
      status: "completed",
    })
    expect(mockGetHeyGenVideoStatus).toHaveBeenCalledTimes(1)
  })
})

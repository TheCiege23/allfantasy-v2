import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createHeyGenVideo,
  getHeyGenVideoStatus,
} from "@/lib/fantasy-media/HeyGenVideoService"

describe("HeyGenVideoService", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.HEYGEN_API_KEY = "test-key"
  })

  it("creates video with server-side HeyGen API request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          video_id: "video-123",
          status: "waiting",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    )

    const result = await createHeyGenVideo({
      title: "Weekly recap",
      sport: "NFL",
      contentType: "weekly_recap",
      script: "Intro. Storylines. CTA.",
    })

    expect(result?.videoId).toBe("video-123")
    expect(result?.payloadMetadata.contentType).toBe("weekly_recap")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("api.heygen.com/v2/videos")
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("test-key")
  })

  it("reads HeyGen status response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: "video-123",
            status: "completed",
            video_url: "https://cdn.heygen.com/video-123.mp4",
            thumbnail_url: "https://cdn.heygen.com/video-123.jpg",
            duration: 121,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    )

    const result = await getHeyGenVideoStatus("video-123")
    expect(result).toEqual({
      videoId: "video-123",
      status: "completed",
      videoUrl: "https://cdn.heygen.com/video-123.mp4",
      thumbnailUrl: "https://cdn.heygen.com/video-123.jpg",
      error: null,
      duration: 121,
    })
  })
})

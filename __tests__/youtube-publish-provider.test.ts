import { beforeEach, describe, expect, it, vi } from "vitest"
import { YouTubePublishProvider } from "@/lib/fantasy-media/publish-providers/YouTubePublishProvider"

const REQUEST_INPUT = {
  destinationType: "youtube" as const,
  episodeId: "episode-1",
  title: "Week 8 Fantasy Recap",
  playbackUrl: "https://cdn.example.com/media/episode-1.mp4",
  userId: "user-1",
}

describe("YouTubePublishProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.YOUTUBE_PUBLISH_ACCESS_TOKEN
    delete process.env.YOUTUBE_PUBLISH_REFRESH_TOKEN
    delete process.env.YOUTUBE_PUBLISH_CLIENT_ID
    delete process.env.YOUTUBE_PUBLISH_CLIENT_SECRET
    delete process.env.YOUTUBE_PUBLISH_TOKEN_URL
    delete process.env.YOUTUBE_PUBLISH_API_BASE
  })

  it("detects configuration from access token or refresh credentials", () => {
    const provider = new YouTubePublishProvider()
    expect(provider.isConfigured()).toBe(false)

    process.env.YOUTUBE_PUBLISH_ACCESS_TOKEN = "youtube-access-token"
    expect(provider.isConfigured()).toBe(true)

    delete process.env.YOUTUBE_PUBLISH_ACCESS_TOKEN
    process.env.YOUTUBE_PUBLISH_REFRESH_TOKEN = "refresh-token"
    process.env.YOUTUBE_PUBLISH_CLIENT_ID = "client-id"
    process.env.YOUTUBE_PUBLISH_CLIENT_SECRET = "client-secret"
    expect(provider.isConfigured()).toBe(true)
  })

  it("uploads via resumable flow and returns success", async () => {
    process.env.YOUTUBE_PUBLISH_ACCESS_TOKEN = "youtube-access-token"

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "video/mp4" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: {
            "content-type": "application/json",
            location: "https://upload.youtube.com/resumable/upload-id-1",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "yt-video-123" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )

    const provider = new YouTubePublishProvider()
    const result = await provider.publish(REQUEST_INPUT)

    expect(result.status).toBe("success")
    expect(result.message).toBe("Uploaded to YouTube")
    expect(result.responseMetadata?.videoId).toBe("yt-video-123")
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const [sourceUrl, sourceInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(sourceUrl).toBe("https://cdn.example.com/media/episode-1.mp4")
    expect(sourceInit.method).toBe("GET")

    const [sessionUrl, sessionInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(sessionUrl).toContain("/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status")
    expect((sessionInit.headers as Record<string, string>).Authorization).toBe(
      "Bearer youtube-access-token"
    )

    const [uploadUrl, uploadInit] = fetchMock.mock.calls[2] as [string, RequestInit]
    expect(uploadUrl).toBe("https://upload.youtube.com/resumable/upload-id-1")
    expect((uploadInit.headers as Record<string, string>).Authorization).toBe(
      "Bearer youtube-access-token"
    )
  })

  it("refreshes token when only refresh credentials are present", async () => {
    process.env.YOUTUBE_PUBLISH_REFRESH_TOKEN = "refresh-token"
    process.env.YOUTUBE_PUBLISH_CLIENT_ID = "client-id"
    process.env.YOUTUBE_PUBLISH_CLIENT_SECRET = "client-secret"

    const refreshHook = vi.fn()

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "refreshed-token", expires_in: 3600 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([7, 8, 9]), {
          status: 200,
          headers: { "content-type": "video/mp4" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: {
            "content-type": "application/json",
            location: "https://upload.youtube.com/resumable/upload-id-2",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "yt-video-789" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )

    const provider = new YouTubePublishProvider()
    const result = await provider.publish({
      ...REQUEST_INPUT,
      onCredentialRefresh: refreshHook,
    })

    expect(result.status).toBe("success")
    expect(result.responseMetadata?.videoId).toBe("yt-video-789")
    expect(refreshHook).toHaveBeenCalledTimes(1)
    expect(refreshHook).toHaveBeenCalledWith({
      providerId: "youtube-provider",
      destinationType: "youtube",
      userId: "user-1",
      accessToken: "refreshed-token",
      expiresInSeconds: 3600,
    })

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(tokenUrl).toBe("https://oauth2.googleapis.com/token")
    expect(tokenInit.method).toBe("POST")
  })

  it("returns failed when upload step is rejected", async () => {
    process.env.YOUTUBE_PUBLISH_ACCESS_TOKEN = "youtube-access-token"

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "video/mp4" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: {
            "content-type": "application/json",
            location: "https://upload.youtube.com/resumable/upload-id-3",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Quota exceeded" } }), {
          status: 400,
          headers: { "content-type": "application/json" },
        })
      )

    const provider = new YouTubePublishProvider()
    const result = await provider.publish(REQUEST_INPUT)

    expect(result.status).toBe("failed")
    expect(result.message).toContain("status 400")
    expect(result.responseMetadata?.step).toBe("upload_bytes")
  })
})

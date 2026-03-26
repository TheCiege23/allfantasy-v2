import { beforeEach, describe, expect, it, vi } from "vitest"
import { XPublishProvider } from "@/lib/fantasy-media/publish-providers/XPublishProvider"

const REQUEST_INPUT = {
  destinationType: "x" as const,
  episodeId: "episode-1",
  title: "Week 8 Fantasy Recap",
  playbackUrl: "https://cdn.example.com/media/episode-1.mp4",
  userId: "user-1",
}

describe("XPublishProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.X_PUBLISH_ACCESS_TOKEN
    delete process.env.X_PUBLISH_API_KEY
    delete process.env.X_PUBLISH_API_BASE
  })

  it("detects configuration from access token env", () => {
    const provider = new XPublishProvider()
    expect(provider.isConfigured()).toBe(false)

    process.env.X_PUBLISH_ACCESS_TOKEN = "x-user-token"
    expect(provider.isConfigured()).toBe(true)
  })

  it("publishes to X tweets API and returns success", async () => {
    process.env.X_PUBLISH_ACCESS_TOKEN = "x-user-token"

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "tweet-123" } }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    )

    const provider = new XPublishProvider()
    const result = await provider.publish(REQUEST_INPUT)

    expect(result.status).toBe("success")
    expect(result.message).toBe("Published to X")
    expect(result.responseMetadata?.tweetId).toBe("tweet-123")
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("api.twitter.com/2/tweets")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer x-user-token")
    expect(init.method).toBe("POST")
    expect(String(init.body)).toContain("Week 8 Fantasy Recap")
    expect(String(init.body)).toContain("https://cdn.example.com/media/episode-1.mp4")
  })

  it("returns failed status with response metadata when X rejects request", async () => {
    process.env.X_PUBLISH_ACCESS_TOKEN = "x-user-token"

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ errors: [{ message: "Forbidden" }] }), {
        status: 403,
        headers: { "content-type": "application/json" },
      })
    )

    const provider = new XPublishProvider()
    const result = await provider.publish(REQUEST_INPUT)

    expect(result.status).toBe("failed")
    expect(result.message).toContain("status 403")
    expect(result.responseMetadata?.status).toBe(403)
  })

  it("returns failed status when network request throws", async () => {
    process.env.X_PUBLISH_ACCESS_TOKEN = "x-user-token"

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"))

    const provider = new XPublishProvider()
    const result = await provider.publish(REQUEST_INPUT)

    expect(result.status).toBe("failed")
    expect(result.message).toBe("X publish request failed")
    expect(result.responseMetadata?.reason).toBe("network down")
  })
})

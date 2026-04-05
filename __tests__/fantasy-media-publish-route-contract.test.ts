import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const getServerSessionMock = vi.hoisted(() => vi.fn())
const publishFantasyMediaEpisodeMock = vi.hoisted(() => vi.fn())
const persistRefreshedYouTubeAccessTokenMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/fantasy-media/FantasyMediaPublishService", () => ({
  publishFantasyMediaEpisode: publishFantasyMediaEpisodeMock,
}))

vi.mock("@/lib/fantasy-media/publish-providers/YouTubeTokenPersistence", () => ({
  persistRefreshedYouTubeAccessToken: persistRefreshedYouTubeAccessTokenMock,
}))

describe("Fantasy media publish route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    persistRefreshedYouTubeAccessTokenMock.mockResolvedValue(1)
  })

  it("requires authentication", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { POST } = await import("@/app/api/fantasy-media/episodes/[id]/publish/route")
    const res = await POST(createMockNextRequest("http://localhost/api/fantasy-media/episodes/ep-1/publish"), {
      params: Promise.resolve({ id: "ep-1" }),
    })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("uses route param episode id and defaults destination to x", async () => {
    publishFantasyMediaEpisodeMock.mockResolvedValueOnce({
      destinationType: "x",
      status: "pending",
      publishId: "pub-default-x",
      message: "Publish requested",
    })

    const { POST } = await import("@/app/api/fantasy-media/episodes/[id]/publish/route")
    const req = createMockNextRequest("http://localhost/api/fantasy-media/episodes/ep-default/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "ep-default" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      destinationType: "x",
      status: "pending",
      publishId: "pub-default-x",
    })
    expect(publishFantasyMediaEpisodeMock).toHaveBeenCalledTimes(1)
    const [episodeId, destinationType, userId, options] =
      publishFantasyMediaEpisodeMock.mock.calls[0] as [
        string,
        string,
        string,
        { onProviderCredentialRefresh?: (payload: unknown) => Promise<void> | void },
      ]
    expect(episodeId).toBe("ep-default")
    expect(destinationType).toBe("x")
    expect(userId).toBe("user-1")
    expect(typeof options?.onProviderCredentialRefresh).toBe("function")
  })

  it("persists refreshed token when destination is youtube", async () => {
    publishFantasyMediaEpisodeMock.mockImplementationOnce(
      async (
        _episodeId: string,
        _destinationType: string,
        userId: string,
        options?: {
          onProviderCredentialRefresh?: (payload: {
            providerId: string
            destinationType: string
            userId: string
            accessToken: string
            expiresInSeconds: number | null
          }) => Promise<void> | void
        }
      ) => {
        await options?.onProviderCredentialRefresh?.({
          providerId: "youtube-provider",
          destinationType: "youtube",
          userId,
          accessToken: "refreshed-token",
          expiresInSeconds: 1800,
        })
        return {
          destinationType: "youtube",
          status: "success",
          publishId: "pub-1",
          message: "Uploaded to YouTube",
        }
      }
    )

    const { POST } = await import("@/app/api/fantasy-media/episodes/[id]/publish/route")
    const req = createMockNextRequest("http://localhost/api/fantasy-media/episodes/ep-1/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ destinationType: "youtube" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "ep-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      destinationType: "youtube",
      status: "success",
      publishId: "pub-1",
    })
    expect(persistRefreshedYouTubeAccessTokenMock).toHaveBeenCalledTimes(1)
    expect(persistRefreshedYouTubeAccessTokenMock).toHaveBeenCalledWith({
      userId: "user-1",
      accessToken: "refreshed-token",
      expiresInSeconds: 1800,
    })
  })

  it("ignores non-youtube credential refresh payloads", async () => {
    publishFantasyMediaEpisodeMock.mockImplementationOnce(
      async (
        _episodeId: string,
        _destinationType: string,
        userId: string,
        options?: {
          onProviderCredentialRefresh?: (payload: {
            providerId: string
            destinationType: string
            userId: string
            accessToken: string
            expiresInSeconds: number | null
          }) => Promise<void> | void
        }
      ) => {
        await options?.onProviderCredentialRefresh?.({
          providerId: "x-provider",
          destinationType: "x",
          userId,
          accessToken: "x-token",
          expiresInSeconds: null,
        })
        return {
          destinationType: "x",
          status: "success",
          publishId: "pub-2",
          message: "Published to X",
        }
      }
    )

    const { POST } = await import("@/app/api/fantasy-media/episodes/[id]/publish/route")
    const req = createMockNextRequest("http://localhost/api/fantasy-media/episodes/ep-2/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ destinationType: "x" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "ep-2" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      destinationType: "x",
      status: "success",
      publishId: "pub-2",
    })
    expect(persistRefreshedYouTubeAccessTokenMock).not.toHaveBeenCalled()
  })
})

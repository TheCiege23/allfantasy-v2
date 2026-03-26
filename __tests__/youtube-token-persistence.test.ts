import { beforeEach, describe, expect, it, vi } from "vitest"

const { authAccountUpdateManyMock } = vi.hoisted(() => ({
  authAccountUpdateManyMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    authAccount: {
      updateMany: authAccountUpdateManyMock,
    },
  },
}))

import { persistRefreshedYouTubeAccessToken } from "@/lib/fantasy-media/publish-providers/YouTubeTokenPersistence"

describe("YouTubeTokenPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.YOUTUBE_PUBLISH_PROVIDER_KEYS
  })

  it("updates google/youtube auth account rows with refreshed token", async () => {
    authAccountUpdateManyMock.mockResolvedValue({ count: 2 })

    const count = await persistRefreshedYouTubeAccessToken({
      userId: "user-1",
      accessToken: "new-token",
      expiresInSeconds: 3600,
    })

    expect(count).toBe(2)
    expect(authAccountUpdateManyMock).toHaveBeenCalledTimes(1)
    const [args] = authAccountUpdateManyMock.mock.calls[0] as [
      {
        where: { userId: string; provider: { in: string[] } }
        data: { access_token: string; expires_at: number | null }
      },
    ]
    expect(args.where.userId).toBe("user-1")
    expect(args.where.provider.in).toEqual(["google", "youtube"])
    expect(args.data.access_token).toBe("new-token")
    expect(typeof args.data.expires_at).toBe("number")
  })

  it("supports provider keys override via env", async () => {
    process.env.YOUTUBE_PUBLISH_PROVIDER_KEYS = "google, custom_google_oauth"
    authAccountUpdateManyMock.mockResolvedValue({ count: 1 })

    await persistRefreshedYouTubeAccessToken({
      userId: "user-2",
      accessToken: "abc",
      expiresInSeconds: null,
    })

    const [args] = authAccountUpdateManyMock.mock.calls[0] as [
      {
        where: { provider: { in: string[] } }
      },
    ]
    expect(args.where.provider.in).toEqual(["google", "custom_google_oauth"])
  })

  it("returns zero on persistence errors", async () => {
    authAccountUpdateManyMock.mockRejectedValue(new Error("db down"))

    const count = await persistRefreshedYouTubeAccessToken({
      userId: "user-3",
      accessToken: "token",
      expiresInSeconds: 1200,
    })

    expect(count).toBe(0)
  })
})

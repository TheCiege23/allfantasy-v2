import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const userProfileFindUniqueMock = vi.hoisted(() => vi.fn())
const userProfileUpdateManyMock = vi.hoisted(() => vi.fn())
const authAccountFindFirstMock = vi.hoisted(() => vi.fn())
const authAccountUpdateMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: userProfileFindUniqueMock,
      updateMany: userProfileUpdateManyMock,
    },
    authAccount: {
      findFirst: authAccountFindFirstMock,
      update: authAccountUpdateMock,
    },
  },
}))

describe("Spotify token route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.SPOTIFY_CLIENT_ID = "spotify-client"
    process.env.SPOTIFY_CLIENT_SECRET = "spotify-secret"
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    authAccountFindFirstMock.mockResolvedValue(null)
    userProfileUpdateManyMock.mockResolvedValue({ count: 1 })
    vi.stubGlobal("fetch", vi.fn())
  })

  it("uses custom settings Spotify profile tokens when no NextAuth authAccount row exists", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    userProfileFindUniqueMock.mockResolvedValueOnce({
      notificationPreferences: {},
      spotifyAccessToken: "profile-access",
      spotifyRefreshToken: "profile-refresh",
      spotifyExpiresAt: expiresAt,
      spotifyDisplayName: "Founder Spotify",
      spotifyConnectedAt: new Date(),
    })

    const { GET } = await import("@/app/api/spotify/token/route")
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      token: "profile-access",
      displayName: "Founder Spotify",
      connected: true,
    })
    expect(authAccountUpdateMock).not.toHaveBeenCalled()
    expect(userProfileUpdateManyMock).not.toHaveBeenCalled()
  })

  it("refreshes expired custom settings Spotify tokens without requiring authAccount", async () => {
    userProfileFindUniqueMock.mockResolvedValueOnce({
      notificationPreferences: {},
      spotifyAccessToken: "stale-profile-access",
      spotifyRefreshToken: "profile-refresh",
      spotifyExpiresAt: new Date(Date.now() - 60_000),
      spotifyDisplayName: "Founder Spotify",
      spotifyConnectedAt: new Date(),
    })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "fresh-profile-access",
        expires_in: 3600,
      }),
    })

    const { GET } = await import("@/app/api/spotify/token/route")
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      token: "fresh-profile-access",
      displayName: "Founder Spotify",
      connected: true,
    })
    expect(userProfileUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        data: expect.objectContaining({
          spotifyAccessToken: "fresh-profile-access",
          spotifyRefreshToken: "profile-refresh",
        }),
      })
    )
  })
})

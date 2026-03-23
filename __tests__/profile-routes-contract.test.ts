import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.fn()
const getPublicProfileByUsernameMock = vi.fn()
const getProfileHighlightsMock = vi.fn()
const getSettingsSnapshotMock = vi.fn()
const getSettingsProfileMock = vi.fn()
const saveSettingsOrchestratedMock = vi.fn()

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/user-settings", () => ({
  getPublicProfileByUsername: getPublicProfileByUsernameMock,
  getProfileHighlights: getProfileHighlightsMock,
  getSettingsSnapshot: getSettingsSnapshotMock,
  getSettingsProfile: getSettingsProfileMock,
  saveSettingsOrchestrated: saveSettingsOrchestratedMock,
}))

describe("Profile route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("serves public profile query and missing username validation", async () => {
    const { GET } = await import("@/app/api/profile/public/route")

    const missingRes = await GET(new Request("http://localhost/api/profile/public"))
    expect(missingRes.status).toBe(400)
    await expect(missingRes.json()).resolves.toEqual({ error: "Missing username" })

    getPublicProfileByUsernameMock.mockResolvedValueOnce(null)
    const missingUserRes = await GET(new Request("http://localhost/api/profile/public?username=ghost"))
    expect(missingUserRes.status).toBe(404)
    await expect(missingUserRes.json()).resolves.toEqual({ error: "Profile not found" })

    getPublicProfileByUsernameMock.mockResolvedValueOnce({
      username: "alpha",
      displayName: "Alpha",
      profileImageUrl: null,
      avatarPreset: "fox",
      bio: "Hello",
      preferredSports: ["NFL", "NCAAB"],
    })
    const okRes = await GET(new Request("http://localhost/api/profile/public?username=alpha"))
    expect(okRes.status).toBe(200)
    await expect(okRes.json()).resolves.toMatchObject({
      username: "alpha",
      preferredSports: ["NFL", "NCAAB"],
    })
  })

  it("requires auth for profile highlights and returns highlight payload", async () => {
    const { GET } = await import("@/app/api/profile/highlights/route")

    getServerSessionMock.mockResolvedValueOnce(null)
    const unauthRes = await GET()
    expect(unauthRes.status).toBe(401)
    await expect(unauthRes.json()).resolves.toEqual({ error: "Unauthorized" })

    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u1" } })
    getProfileHighlightsMock.mockResolvedValueOnce({
      gmPrestigeScore: 72.4,
      gmTierLabel: "Elite",
      reputationTier: "TRUSTED",
      reputationScore: 81.2,
      legacyScore: 67.5,
      contextLeagueName: "Dynasty Alpha",
    })
    const okRes = await GET()
    expect(okRes.status).toBe(200)
    expect(getProfileHighlightsMock).toHaveBeenCalledWith("u1")
  })

  it("patches own profile via save orchestrator and forwards preferred sports", async () => {
    const { PATCH } = await import("@/app/api/user/profile/route")
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "u1" } })
    getSettingsProfileMock.mockResolvedValueOnce({
      preferredLanguage: "en",
      themePreference: "dark",
      timezone: "America/New_York",
    })
    saveSettingsOrchestratedMock.mockResolvedValueOnce({ ok: true })

    const req = new Request("http://localhost/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "New Name",
        preferredSports: ["NFL", "SOCCER", "NCAAF"],
      }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    expect(saveSettingsOrchestratedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        payload: {
          profile: expect.objectContaining({
            displayName: "New Name",
            preferredSports: ["NFL", "SOCCER", "NCAAF"],
          }),
          settings: undefined,
        },
      })
    )
  })
})

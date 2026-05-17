import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

describe("/api/user/me entitlement flags", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns admin nav and all-access flags for the configured test account", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
        email: "Cjabar.henson@gmail.com",
        username: "TheCiege26",
        name: "TheCiege26",
      },
    })

    const { GET } = await import("@/app/api/user/me/route")
    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      user: {
        id: "user-1",
        email: "Cjabar.henson@gmail.com",
        username: "TheCiege26",
      },
      isAdmin: true,
      entitlements: {
        allFantasyTestAccess: true,
        afCommissioner: true,
        aiAccess: true,
        poolAdminAccess: true,
        chatAdminAccess: true,
      },
    })
  })

  it("does not return admin or all-access flags for a normal user", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "user-2",
        email: "member@example.com",
        username: "normal-user",
        name: "Normal User",
      },
    })

    const { GET } = await import("@/app/api/user/me/route")
    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      isAdmin: false,
      entitlements: {
        allFantasyTestAccess: false,
        afCommissioner: false,
        aiAccess: false,
        poolAdminAccess: false,
        chatAdminAccess: false,
      },
    })
  })
})

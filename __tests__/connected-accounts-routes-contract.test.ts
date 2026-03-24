import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const authAccountFindManyMock = vi.hoisted(() => vi.fn())
const authAccountDeleteManyMock = vi.hoisted(() => vi.fn())
const appUserFindUniqueMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    authAccount: {
      findMany: authAccountFindManyMock,
      deleteMany: authAccountDeleteManyMock,
    },
    appUser: {
      findUnique: appUserFindUniqueMock,
    },
  },
}))

describe("Connected accounts route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    authAccountFindManyMock.mockResolvedValue([])
    authAccountDeleteManyMock.mockResolvedValue({ count: 1 })
    appUserFindUniqueMock.mockResolvedValue({ passwordHash: "hash" })
  })

  it("GET requires authentication", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { GET } = await import("@/app/api/user/connected-accounts/route")
    const res = await GET()
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("GET normalizes provider aliases and computes disconnect safety", async () => {
    authAccountFindManyMock.mockResolvedValueOnce([{ provider: "twitter" }])
    appUserFindUniqueMock.mockResolvedValueOnce({ passwordHash: null })

    const { GET } = await import("@/app/api/user/connected-accounts/route")
    const res = await GET()
    expect(res.status).toBe(200)
    const data = (await res.json()) as { providers: Array<Record<string, unknown>> }
    const xProvider = data.providers.find((provider) => provider.id === "x")
    expect(xProvider).toMatchObject({
      id: "x",
      linked: true,
      disconnectable: false,
      disconnectBlockedReason: "LOCKOUT_RISK",
    })
  })

  it("DELETE blocks disconnect when it would lock out user", async () => {
    authAccountFindManyMock.mockResolvedValueOnce([{ provider: "google" }])
    appUserFindUniqueMock.mockResolvedValueOnce({ passwordHash: null })

    const { DELETE } = await import("@/app/api/user/connected-accounts/[providerId]/route")
    const res = await DELETE(new Request("http://localhost/api/user/connected-accounts/google"), {
      params: { providerId: "google" },
    } as any)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: "LOCKOUT_RISK" })
    expect(authAccountDeleteManyMock).not.toHaveBeenCalled()
  })

  it("DELETE disconnects provider when user has password fallback", async () => {
    authAccountFindManyMock
      .mockResolvedValueOnce([{ provider: "google" }])
      .mockResolvedValueOnce([])
    appUserFindUniqueMock.mockResolvedValue({ passwordHash: "hash" })

    const { DELETE } = await import("@/app/api/user/connected-accounts/[providerId]/route")
    const res = await DELETE(new Request("http://localhost/api/user/connected-accounts/google"), {
      params: { providerId: "google" },
    } as any)

    expect(res.status).toBe(200)
    const data = (await res.json()) as { ok: boolean; providers: Array<Record<string, unknown>> }
    expect(data.ok).toBe(true)
    const googleProvider = data.providers.find((provider) => provider.id === "google")
    expect(googleProvider).toMatchObject({ id: "google", linked: false })
    expect(authAccountDeleteManyMock).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        provider: { in: ["google"] },
      },
    })
  })
})

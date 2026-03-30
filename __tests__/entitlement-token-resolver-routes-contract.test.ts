import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const entitlementResolveForUserMock = vi.hoisted(() => vi.fn())
const tokenResolveForUserMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/subscription/EntitlementResolver", () => ({
  EntitlementResolver: class {
    resolveForUser = entitlementResolveForUserMock
  },
}))

vi.mock("@/lib/tokens/TokenBalanceResolver", () => ({
  TokenBalanceResolver: class {
    resolveForUser = tokenResolveForUserMock
  },
}))

describe("Resolver-backed entitlement/token routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    entitlementResolveForUserMock.mockResolvedValue({
      entitlement: {
        plans: [],
        status: "none",
        currentPeriodEnd: null,
        gracePeriodEnd: null,
      },
      hasAccess: false,
      message: "Upgrade to access this feature.",
    })
    tokenResolveForUserMock.mockResolvedValue({
      balance: 0,
      updatedAt: "2026-03-30T00:00:00.000Z",
    })
  })

  it("subscription entitlements route delegates to resolver and preserves shape", async () => {
    const { GET } = await import("@/app/api/subscription/entitlements/route")
    const req = new Request("http://localhost/api/subscription/entitlements?feature=ai_chat")
    const res = await GET(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      entitlement: {
        plans: [],
        status: "none",
        currentPeriodEnd: null,
        gracePeriodEnd: null,
      },
      hasAccess: false,
      message: "Upgrade to access this feature.",
    })
    expect(entitlementResolveForUserMock).toHaveBeenCalledWith("u1", "ai_chat")
  })

  it("tokens balance route delegates to resolver and preserves shape", async () => {
    const { GET } = await import("@/app/api/tokens/balance/route")
    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      balance: 0,
      updatedAt: "2026-03-30T00:00:00.000Z",
    })
    expect(tokenResolveForUserMock).toHaveBeenCalledWith("u1")
  })
})

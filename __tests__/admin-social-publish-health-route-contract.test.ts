import { beforeEach, describe, expect, it, vi } from "vitest"

const { requireAdminMock, getSocialPublishHealthStatusMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getSocialPublishHealthStatusMock: vi.fn(),
}))

vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: requireAdminMock,
}))

vi.mock("@/lib/social-clips-grok/SocialPublishHealthResolver", () => ({
  getSocialPublishHealthStatus: getSocialPublishHealthStatusMock,
}))

describe("Admin social publish health route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns auth gate response when admin check fails", async () => {
    requireAdminMock.mockResolvedValueOnce({
      ok: false,
      res: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    })
    const { GET } = await import("@/app/api/admin/system/social-publish-health/route")
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns social publish health payload for admins", async () => {
    requireAdminMock.mockResolvedValueOnce({ ok: true })
    getSocialPublishHealthStatusMock.mockResolvedValueOnce({
      generatedAt: "2026-03-25T00:00:00.000Z",
      platforms: [
        {
          platform: "x",
          configured: true,
          latestResponseMetadata: { requestId: "req_123", error: "rate_limit" },
          latestErrorSummary: "rate_limit",
        },
      ],
    })

    const { GET } = await import("@/app/api/admin/system/social-publish-health/route")
    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      platforms: [
        {
          platform: "x",
          configured: true,
          latestResponseMetadata: { requestId: "req_123", error: "rate_limit" },
          latestErrorSummary: "rate_limit",
        },
      ],
    })
  })
})

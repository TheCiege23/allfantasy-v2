import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const getServerSessionMock = vi.hoisted(() => vi.fn())
const getConnectedTargetsMock = vi.hoisted(() => vi.fn())
const setAutoPostingMock = vi.hoisted(() => vi.fn())
const linkAccountMock = vi.hoisted(() => vi.fn())
const unlinkAccountMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/social-clips-grok/ConnectedSocialAccountResolver", () => ({
  getConnectedTargets: getConnectedTargetsMock,
  setAutoPosting: setAutoPostingMock,
  linkAccount: linkAccountMock,
  unlinkAccount: unlinkAccountMock,
}))

describe("Share targets route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
  })

  it("returns 503 when connecting an unavailable provider", async () => {
    getConnectedTargetsMock.mockResolvedValueOnce([
      {
        platform: "instagram",
        accountIdentifier: null,
        autoPostingEnabled: false,
        connected: false,
        providerConfigured: false,
      },
    ])

    const { POST } = await import("@/app/api/share/targets/route")
    const req = createMockNextRequest("http://localhost/api/share/targets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform: "instagram", action: "connect" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
    })
    expect(linkAccountMock).not.toHaveBeenCalled()
  })

  it("connects provider when configured and returns updated targets", async () => {
    getConnectedTargetsMock
      .mockResolvedValueOnce([
        {
          platform: "x",
          accountIdentifier: null,
          autoPostingEnabled: false,
          connected: false,
          providerConfigured: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          platform: "x",
          accountIdentifier: "x_user-1",
          autoPostingEnabled: false,
          connected: true,
          providerConfigured: true,
        },
      ])

    const { POST } = await import("@/app/api/share/targets/route")
    const req = createMockNextRequest("http://localhost/api/share/targets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform: "x", action: "connect" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(linkAccountMock).toHaveBeenCalledWith("user-1", "x", "x_user-1")
    await expect(res.json()).resolves.toMatchObject({
      targets: [{ platform: "x", connected: true }],
    })
  })

  it("toggles auto-post via setAutoPosting", async () => {
    getConnectedTargetsMock.mockResolvedValueOnce([
      {
        platform: "x",
        accountIdentifier: "@user",
        autoPostingEnabled: true,
        connected: true,
        providerConfigured: true,
      },
    ])

    const { POST } = await import("@/app/api/share/targets/route")
    const req = createMockNextRequest("http://localhost/api/share/targets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform: "x", autoPostingEnabled: true }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(setAutoPostingMock).toHaveBeenCalledWith("user-1", "x", true)
  })
})

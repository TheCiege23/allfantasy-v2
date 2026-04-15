import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const cookiesMock = vi.hoisted(() => vi.fn())
const encryptMock = vi.hoisted(() => vi.fn((value: string) => `enc:${value}`))
const decryptMock = vi.hoisted(() => vi.fn())

const yahooConnectionUpsertMock = vi.hoisted(() => vi.fn())
const userProfileUpsertMock = vi.hoisted(() => vi.fn())
const userProfileFindUniqueMock = vi.hoisted(() => vi.fn())
const userProfileUpdateMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/telemetry/usage", () => ({
  withApiUsage:
    () =>
    <T extends (...args: any[]) => any>(handler: T) =>
      handler,
}))

vi.mock("@/lib/league-auth-crypto", () => ({
  encrypt: encryptMock,
  decrypt: decryptMock,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    yahooConnection: {
      upsert: yahooConnectionUpsertMock,
    },
    userProfile: {
      upsert: userProfileUpsertMock,
      findUnique: userProfileFindUniqueMock,
      update: userProfileUpdateMock,
    },
  },
}))

describe("Auth provider OAuth route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.YAHOO_CLIENT_ID = "test-yahoo-client-id"
    process.env.YAHOO_CLIENT_SECRET = "test-yahoo-client-secret"
    process.env.DISCORD_CLIENT_SECRET = "test-discord-client-secret"

    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    cookiesMock.mockReturnValue({
      get: vi.fn((name: string) => {
        if (name === "discord_oauth_state") return { value: "expected-state" }
        if (name === "discord_oauth_user_id") return { value: "u1" }
        return undefined
      }),
      delete: vi.fn(),
    })

    userProfileFindUniqueMock.mockResolvedValue({ discordAccessToken: null })
    userProfileUpdateMock.mockResolvedValue({})
    yahooConnectionUpsertMock.mockResolvedValue({})
    userProfileUpsertMock.mockResolvedValue({})

    vi.stubGlobal("fetch", vi.fn())
  })

  it("Discord callback redirects to login when session is missing", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)

    const { GET } = await import("@/app/api/auth/discord/callback/route")
    const res = await GET(
      createMockNextRequest("http://localhost:3000/api/auth/discord/callback?code=abc&state=expected-state") as any
    )

    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login?callbackUrl=/settings")
  })

  it("Discord callback rejects invalid state/user binding", async () => {
    const deleteMock = vi.fn()
    cookiesMock.mockReturnValueOnce({
      get: vi.fn((name: string) => {
        if (name === "discord_oauth_state") return { value: "expected-state" }
        if (name === "discord_oauth_user_id") return { value: "different-user" }
        return undefined
      }),
      delete: deleteMock,
    })

    const { GET } = await import("@/app/api/auth/discord/callback/route")
    const res = await GET(
      createMockNextRequest("http://localhost:3000/api/auth/discord/callback?code=abc&state=expected-state") as any
    )

    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/settings?discord=error")
    expect(deleteMock).toHaveBeenCalledWith("discord_oauth_state")
    expect(deleteMock).toHaveBeenCalledWith("discord_oauth_user_id")
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("Yahoo callback rejects invalid OAuth state/user binding", async () => {
    const { GET } = await import("@/app/api/auth/yahoo/callback/route")
    const req = createMockNextRequest(
      "http://localhost:3000/api/auth/yahoo/callback?code=abc&state=expected-state",
      {
        headers: {
          cookie: "yahoo_oauth_state=expected-state; yahoo_oauth_user_id=different-user",
        },
      }
    )

    const res = await GET(req as any)

    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/af-legacy?yahoo_error=invalid_state")
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("Yahoo callback rejects missing code before token exchange", async () => {
    const { GET } = await import("@/app/api/auth/yahoo/callback/route")
    const req = createMockNextRequest("http://localhost:3000/api/auth/yahoo/callback?state=expected-state", {
      headers: {
        cookie: "yahoo_oauth_state=expected-state; yahoo_oauth_user_id=u1",
      },
    })

    const res = await GET(req as any)

    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/af-legacy?yahoo_error=no_code")
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("Discord disconnect keeps compatibility with legacy plaintext token", async () => {
    userProfileFindUniqueMock.mockResolvedValueOnce({ discordAccessToken: "legacy-plain-token" })
    decryptMock.mockImplementationOnce(() => {
      throw new Error("legacy token")
    })
    ;(global.fetch as any).mockResolvedValue({ ok: true })

    const { POST } = await import("@/app/api/auth/discord/disconnect/route")
    const res = await POST()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
    expect(global.fetch).toHaveBeenCalled()
    const revokeBody = ((global.fetch as any).mock.calls[0]?.[1]?.body as URLSearchParams).get("token")
    expect(revokeBody).toBe("legacy-plain-token")
    expect(userProfileUpdateMock).toHaveBeenCalled()
  })
})

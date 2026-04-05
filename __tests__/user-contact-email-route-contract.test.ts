import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const getServerSessionMock = vi.hoisted(() => vi.fn())
const rateLimitMock = vi.hoisted(() => vi.fn(() => ({ success: true })))
const getClientIpMock = vi.hoisted(() => vi.fn(() => "127.0.0.1"))
const bcryptCompareMock = vi.hoisted(() => vi.fn())
const makeTokenMock = vi.hoisted(() => vi.fn(() => "raw-token"))
const sha256HexMock = vi.hoisted(() => vi.fn(() => "hashed-token"))
const getBaseUrlMock = vi.hoisted(() => vi.fn(() => "http://localhost:3000"))
const resendSendMock = vi.hoisted(() => vi.fn())

const appUserFindUniqueMock = vi.hoisted(() => vi.fn())
const appUserFindFirstMock = vi.hoisted(() => vi.fn())
const appUserUpdateMock = vi.hoisted(() => vi.fn())
const userProfileUpdateManyMock = vi.hoisted(() => vi.fn())
const emailVerifyTokenDeleteManyMock = vi.hoisted(() => vi.fn())
const emailVerifyTokenCreateMock = vi.hoisted(() => vi.fn())
const txAppUserUpdateMock = vi.hoisted(() => vi.fn())
const txUserProfileUpdateManyMock = vi.hoisted(() => vi.fn())
const transactionMock = vi.hoisted(() =>
  vi.fn(async (cb: (tx: any) => Promise<void>) =>
    cb({
      appUser: { update: txAppUserUpdateMock },
      userProfile: { updateMany: txUserProfileUpdateManyMock },
    })
  )
)

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: rateLimitMock,
  getClientIp: getClientIpMock,
}))

vi.mock("bcryptjs", () => ({
  default: {
    compare: bcryptCompareMock,
  },
}))

vi.mock("@/lib/tokens", () => ({
  makeToken: makeTokenMock,
  sha256Hex: sha256HexMock,
}))

vi.mock("@/lib/get-base-url", () => ({
  getBaseUrl: getBaseUrlMock,
}))

vi.mock("@/lib/resend-client", () => ({
  getResendClient: async () => ({
    client: {
      emails: {
        send: resendSendMock,
      },
    },
    fromEmail: "AllFantasy <noreply@allfantasy.ai>",
  }),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findUnique: appUserFindUniqueMock,
      findFirst: appUserFindFirstMock,
      update: appUserUpdateMock,
    },
    userProfile: {
      updateMany: userProfileUpdateManyMock,
    },
    emailVerifyToken: {
      deleteMany: emailVerifyTokenDeleteManyMock,
      create: emailVerifyTokenCreateMock,
    },
    $transaction: transactionMock,
  },
}))

describe("User contact email route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    rateLimitMock.mockReturnValue({ success: true })
    appUserFindUniqueMock.mockResolvedValue({
      id: "u1",
      email: "old@example.com",
      passwordHash: "hashed-current-password",
    })
    appUserFindFirstMock.mockResolvedValue(null)
    bcryptCompareMock.mockResolvedValue(true)
    txAppUserUpdateMock.mockResolvedValue(undefined)
    txUserProfileUpdateManyMock.mockResolvedValue(undefined)
    emailVerifyTokenDeleteManyMock.mockResolvedValue(undefined)
    emailVerifyTokenCreateMock.mockResolvedValue(undefined)
    resendSendMock.mockResolvedValue({ id: "email_1" })
  })

  it("returns 401 when unauthenticated", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { POST } = await import("@/app/api/user/contact/email/route")
    const res = await POST(
      createMockNextRequest("http://localhost/api/user/contact/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "new@example.com" }),
      }) as any
    )

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "UNAUTHORIZED" })
  })

  it("returns 429 when rate limited", async () => {
    rateLimitMock.mockReturnValueOnce({ success: false })
    const { POST } = await import("@/app/api/user/contact/email/route")
    const res = await POST(
      createMockNextRequest("http://localhost/api/user/contact/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "new@example.com" }),
      }) as any
    )

    expect(res.status).toBe(429)
    await expect(res.json()).resolves.toMatchObject({ error: "RATE_LIMITED" })
  })

  it("validates email format", async () => {
    const { POST } = await import("@/app/api/user/contact/email/route")
    const res = await POST(
      createMockNextRequest("http://localhost/api/user/contact/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "bad-email" }),
      }) as any
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: "INVALID_EMAIL" })
  })

  it("requires current password for password accounts", async () => {
    const { POST } = await import("@/app/api/user/contact/email/route")
    const res = await POST(
      createMockNextRequest("http://localhost/api/user/contact/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "new@example.com" }),
      }) as any
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: "CURRENT_PASSWORD_REQUIRED" })
  })

  it("rejects wrong current password", async () => {
    bcryptCompareMock.mockResolvedValueOnce(false)
    const { POST } = await import("@/app/api/user/contact/email/route")
    const res = await POST(
      createMockNextRequest("http://localhost/api/user/contact/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "new@example.com", currentPassword: "wrong-pass" }),
      }) as any
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: "WRONG_PASSWORD" })
  })

  it("returns duplicate email conflict", async () => {
    appUserFindFirstMock.mockResolvedValueOnce({ id: "u2" })
    const { POST } = await import("@/app/api/user/contact/email/route")
    const res = await POST(
      createMockNextRequest("http://localhost/api/user/contact/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "taken@example.com", currentPassword: "Password123!" }),
      }) as any
    )

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: "EMAIL_ALREADY_IN_USE" })
  })

  it("returns unchanged when email matches current value", async () => {
    const { POST } = await import("@/app/api/user/contact/email/route")
    const res = await POST(
      createMockNextRequest("http://localhost/api/user/contact/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "OLD@example.com", currentPassword: "Password123!" }),
      }) as any
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      ok: true,
      unchanged: true,
      verificationEmailSent: false,
    })
    expect(transactionMock).not.toHaveBeenCalled()
    expect(resendSendMock).not.toHaveBeenCalled()
  })

  it("updates email, resets verification, and sends verify email", async () => {
    appUserFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "old@example.com",
      passwordHash: null,
    })
    const { POST } = await import("@/app/api/user/contact/email/route")
    const res = await POST(
      createMockNextRequest("http://localhost/api/user/contact/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "NewEmail@Example.com",
          returnTo: "/settings?tab=security",
        }),
      }) as any
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      ok: true,
      email: "newemail@example.com",
      verificationEmailSent: true,
    })

    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(txAppUserUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { email: "newemail@example.com", emailVerified: null },
    })
    expect(txUserProfileUpdateManyMock).toHaveBeenCalledWith({
      where: { userId: "u1" },
      data: { emailVerifiedAt: null },
    })
    expect(emailVerifyTokenDeleteManyMock).toHaveBeenCalledWith({ where: { userId: "u1" } })
    expect(emailVerifyTokenCreateMock).toHaveBeenCalled()
    expect(resendSendMock).toHaveBeenCalledTimes(1)
  })

  it("still succeeds when verification email dispatch fails", async () => {
    appUserFindUniqueMock.mockResolvedValueOnce({
      id: "u1",
      email: "old@example.com",
      passwordHash: null,
    })
    resendSendMock.mockRejectedValueOnce(new Error("resend unavailable"))

    const { POST } = await import("@/app/api/user/contact/email/route")
    const res = await POST(
      createMockNextRequest("http://localhost/api/user/contact/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "fallback@example.com",
          returnTo: "/settings?tab=security",
        }),
      }) as any
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      ok: true,
      email: "fallback@example.com",
      verificationEmailSent: false,
    })
    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(emailVerifyTokenCreateMock).toHaveBeenCalledTimes(1)
    expect(resendSendMock).toHaveBeenCalledTimes(1)
  })
})

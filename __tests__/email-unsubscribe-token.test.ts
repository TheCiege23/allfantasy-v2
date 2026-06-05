import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

describe("marketing email unsubscribe token", () => {
  it("round-trips a signed email without exposing the raw address as the whole token", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret"
    const { createEmailUnsubscribeToken, verifyEmailUnsubscribeToken } = await import("@/lib/email/marketing-email")

    const token = createEmailUnsubscribeToken("User@Example.com")
    const verified = verifyEmailUnsubscribeToken(token)

    expect(verified).toEqual({ email: "user@example.com" })
    expect(token).not.toBe("user@example.com")
  })

  it("rejects tampered tokens", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret"
    const { createEmailUnsubscribeToken, verifyEmailUnsubscribeToken } = await import("@/lib/email/marketing-email")

    const token = createEmailUnsubscribeToken("user@example.com")

    expect(verifyEmailUnsubscribeToken(`${token}x`)).toBeNull()
  })
})

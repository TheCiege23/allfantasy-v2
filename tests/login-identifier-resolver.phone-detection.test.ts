import { describe, expect, it } from "vitest"
import { isPhoneLoginCandidate } from "@/lib/auth/login-identifier-resolver"

describe("login identifier phone detection", () => {
  it("accepts phone-formatted identifiers", () => {
    expect(isPhoneLoginCandidate("+1 555 123 4567")).toBe(true)
    expect(isPhoneLoginCandidate("5551234567")).toBe(true)
    expect(isPhoneLoginCandidate("(555) 123-4567")).toBe(true)
  })

  it("rejects digit-heavy usernames and emails", () => {
    expect(isPhoneLoginCandidate("e2e1774018871494")).toBe(false)
    expect(isPhoneLoginCandidate("e2e.1774018871494@example.com")).toBe(false)
  })
})

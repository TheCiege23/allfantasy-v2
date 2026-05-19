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

describe("login identifier classification — username vs email vs phone", () => {
  it("classifies mixed-case username strings as non-phone", () => {
    // These look like usernames (letters + digits) — must not be treated as phone numbers.
    // The DB query uses mode:"insensitive" so TheCiege26, theciege26, THECIEGE26 all resolve
    // to the same AppUser without the caller needing to normalise the casing.
    expect(isPhoneLoginCandidate("TheCiege26")).toBe(false)
    expect(isPhoneLoginCandidate("theciege26")).toBe(false)
    expect(isPhoneLoginCandidate("THECIEGE26")).toBe(false)
  })

  it("classifies @ strings as non-phone", () => {
    expect(isPhoneLoginCandidate("user@gmail.com")).toBe(false)
    expect(isPhoneLoginCandidate("USER@GMAIL.COM")).toBe(false)
  })
})

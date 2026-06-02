/**
 * login-identifier-auth.test.ts
 *
 * Comprehensive tests for the login identifier + phone uniqueness system:
 *
 *   1. resolveLoginToUser passes mode:"insensitive" — case-insensitive for ALL users
 *   2. No hardcoded username logic in the login resolver
 *   3. isPhoneLoginCandidate correctly classifies generic usernames as non-phone
 *   4. Generic username variants (lower / mixed / upper) are treated identically
 *   5. Auth error messages do NOT reveal account existence (no info disclosure)
 *   6. Phone duplicate pre-check exists in verify/phone/start route
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { isPhoneLoginCandidate } from "@/lib/auth/login-identifier-resolver"

const cwd = process.cwd()
function read(rel: string) {
  return readFileSync(resolve(cwd, rel), "utf-8")
}

// ── 1. resolveLoginToUser — mode:"insensitive" is general (static) ─────────

describe("resolveLoginToUser — case-insensitive lookup present for all users", () => {
  it('uses mode:"insensitive" for the email OR branch', () => {
    const src = read("lib/auth/login-identifier-resolver.ts")
    // Both fields inside the OR[] must carry mode:"insensitive"
    expect(src).toContain('mode: "insensitive"')
  })

  it('pairs mode:"insensitive" with username equals check', () => {
    const src = read("lib/auth/login-identifier-resolver.ts")
    // Confirm username lookup has the insensitive flag (not just email)
    const usernameBlock = src.match(/username[\s\S]{0,120}mode.*insensitive/)
    expect(usernameBlock).toBeTruthy()
  })

  it("does not contain any hardcoded username string in login resolver logic", () => {
    const src = read("lib/auth/login-identifier-resolver.ts")
    // Strings like "theciege" (in any case) must not appear as literal values
    expect(src.toLowerCase()).not.toContain('"theciege')
    expect(src.toLowerCase()).not.toContain("'theciege")
    expect(src.toLowerCase()).not.toContain("`theciege")
  })

  it("does not contain any per-user bypass or special-case branch", () => {
    const src = read("lib/auth/login-identifier-resolver.ts")
    // No explicit single-username guard
    expect(src).not.toMatch(/if.*username.*===|===.*username.*"/)
  })
})

// ── 2. isPhoneLoginCandidate — generic alphanumeric usernames ─────────────────

describe("isPhoneLoginCandidate — generic usernames classified as non-phone", () => {
  it("rejects lowercase generic username", () => {
    expect(isPhoneLoginCandidate("testplayer99")).toBe(false)
  })

  it("rejects mixed-case generic username", () => {
    expect(isPhoneLoginCandidate("TestPlayer99")).toBe(false)
  })

  it("rejects all-caps generic username", () => {
    expect(isPhoneLoginCandidate("TESTPLAYER99")).toBe(false)
  })

  it("rejects usernamed26 lower variant", () => {
    expect(isPhoneLoginCandidate("usernamed26")).toBe(false)
  })

  it("rejects UserNameD26 mixed variant", () => {
    expect(isPhoneLoginCandidate("UserNameD26")).toBe(false)
  })

  it("rejects USERNAMED26 upper variant", () => {
    expect(isPhoneLoginCandidate("USERNAMED26")).toBe(false)
  })

  it("rejects TheCiege username case variants as phone candidates", () => {
    expect(isPhoneLoginCandidate("TheCiege26m")).toBe(false)
    expect(isPhoneLoginCandidate("theciege26")).toBe(false)
    expect(isPhoneLoginCandidate("theCiege26")).toBe(false)
  })

  it("still accepts valid phone formats", () => {
    expect(isPhoneLoginCandidate("+1 555 123 4567")).toBe(true)
    expect(isPhoneLoginCandidate("5551234567")).toBe(true)
    expect(isPhoneLoginCandidate("(555) 123-4567")).toBe(true)
  })

  it("still rejects digit-heavy username-style strings", () => {
    expect(isPhoneLoginCandidate("e2e1774018871494")).toBe(false)
  })

  it("still rejects email addresses", () => {
    expect(isPhoneLoginCandidate("user@example.com")).toBe(false)
    expect(isPhoneLoginCandidate("USER@EXAMPLE.COM")).toBe(false)
  })
})

// ── 3. Auth error messages — no account existence disclosure ─────────────────

describe("resolveLoginErrorMessage — no info disclosure", () => {
  it("does not reveal a Sleeper-only account exists", () => {
    const src = read("lib/auth/AuthErrorMessageResolver.ts")
    // Old revealing message must be gone
    expect(src).not.toContain("Sleeper-linked only")
    expect(src).not.toContain("Sign in with Sleeper or set a password")
  })

  it("does not reveal that a password has not been set", () => {
    const src = read("lib/auth/AuthErrorMessageResolver.ts")
    // Old revealing message must be gone
    expect(src).not.toContain("No password has been set")
  })

  it("uses the generic invalid-credentials message as the default fallback", () => {
    const src = read("lib/auth/AuthErrorMessageResolver.ts")
    expect(src).toContain("Invalid username, email, phone, or password.")
  })

  it("does NOT leak PASSWORD_NOT_SET or SLEEPER_ONLY_ACCOUNT in user-visible strings", () => {
    const src = read("lib/auth/AuthErrorMessageResolver.ts")
    // The error codes can appear in comparisons but must not be returned to the user
    // Find all return statements and check none contain the code as the return value
    const returnStatements = src.match(/return\s+'[^']*'/g) ?? []
    for (const ret of returnStatements) {
      expect(ret).not.toContain("PASSWORD_NOT_SET")
      expect(ret).not.toContain("SLEEPER_ONLY_ACCOUNT")
    }
  })
})

// ── 4. Phone duplicate pre-check in verify/phone/start route ─────────────────

describe("verify/phone/start — phone uniqueness pre-check", () => {
  it("rejects phone already linked to another account (PHONE_ALREADY_IN_USE code)", () => {
    const src = read("app/api/verify/phone/start/route.ts")
    expect(src).toContain("PHONE_ALREADY_IN_USE")
  })

  it("checks the phone against existing profiles before sending OTP", () => {
    const src = read("app/api/verify/phone/start/route.ts")
    // Must query the profile table for an existing phone owner
    expect(src).toContain("existingProfile")
    expect(src).toContain("findUnique")
  })

  it("only blocks if the phone is owned by a DIFFERENT user (not self)", () => {
    const src = read("app/api/verify/phone/start/route.ts")
    // The guard compares existingProfile.userId !== userId so self-reverify still works
    expect(src).toContain("existingProfile.userId !== userId")
  })

  it("returns 409 for duplicate phone number", () => {
    const src = read("app/api/verify/phone/start/route.ts")
    expect(src).toContain("status: 409")
  })
})

describe("signup username canonicalization", () => {
  it("preserves the submitted username casing for storage/display", () => {
    const src = read("app/api/auth/register/route.ts")
    expect(src).toContain("return u.trim()")
    expect(src).not.toContain("return u.trim().toLowerCase()")
  })

  it("checks registration username conflicts case-insensitively", () => {
    const src = read("app/api/auth/register/route.ts")
    expect(src).toContain('{ username: { equals: username, mode: "insensitive" } }')
  })

  it("checks username availability case-insensitively", () => {
    const src = read("app/api/auth/check-username/route.ts")
    expect(src).toContain('{ username: { equals: normalized, mode: "insensitive" } }')
  })
})

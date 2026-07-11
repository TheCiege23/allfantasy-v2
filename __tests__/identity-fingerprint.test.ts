import { describe, expect, it, beforeEach } from "vitest"
import { hashIp, hashUserAgent } from "@/lib/identity/IdentityFingerprint"

describe("IdentityFingerprint", () => {
  beforeEach(() => {
    process.env.IDENTITY_FINGERPRINT_SALT = "test-salt-do-not-use-in-prod"
  })

  it("never returns the raw IP", () => {
    const hashed = hashIp("203.0.113.42")
    expect(hashed).not.toBeNull()
    expect(hashed).not.toContain("203.0.113.42")
  })

  it("is deterministic for the same input", () => {
    expect(hashIp("203.0.113.42")).toBe(hashIp("203.0.113.42"))
  })

  it("produces different hashes for different IPs", () => {
    expect(hashIp("203.0.113.42")).not.toBe(hashIp("198.51.100.7"))
  })

  it("treats 'unknown' and empty/null as no signal, not a hashable value", () => {
    expect(hashIp("unknown")).toBeNull()
    expect(hashIp(null)).toBeNull()
    expect(hashIp(undefined)).toBeNull()
    expect(hashIp("")).toBeNull()
  })

  it("hashes user-agent strings the same way (deterministic, never raw)", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestAgent/1.0"
    const hashed = hashUserAgent(ua)
    expect(hashed).not.toBeNull()
    expect(hashed).not.toContain("Mozilla")
    expect(hashUserAgent(ua)).toBe(hashed)
  })

  it("changes output if the salt changes (confirms salt is actually used)", () => {
    const first = hashIp("203.0.113.42")
    process.env.IDENTITY_FINGERPRINT_SALT = "a-different-salt"
    const second = hashIp("203.0.113.42")
    expect(first).not.toBe(second)
  })
})

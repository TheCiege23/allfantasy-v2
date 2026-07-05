import { createHmac } from "crypto"
import { resolveAuthSecret } from "@/lib/auth/resolve-auth-secret"

/**
 * Hashing for identity signals (IP, user-agent). Never store the raw value —
 * only this HMAC digest. Dedicated salt so a leak of this hash can't be used
 * to help brute-force the auth signing secret, and vice versa; falls back to
 * a derived value from the auth secret (never the same raw secret) so this
 * works out of the box without requiring an immediate ops change.
 */
function resolveFingerprintSalt(): string {
  const explicit = process.env.IDENTITY_FINGERPRINT_SALT?.trim()
  if (explicit) return explicit

  const authSecret = resolveAuthSecret()
  if (authSecret) {
    // Derive, don't reuse verbatim — a different HMAC context than NextAuth's own signing use.
    return createHmac("sha256", authSecret).update("identity-fingerprint-salt-v1").digest("hex")
  }

  // Build-time / CI paths that never handle real traffic. Never reached in a
  // runtime that also requires NEXTAUTH_SECRET/AUTH_SECRET to be set.
  return "identity-fingerprint-fallback-salt-do-not-use-in-production"
}

function hash(value: string): string {
  return createHmac("sha256", resolveFingerprintSalt()).update(value.trim()).digest("hex")
}

/** HMAC-SHA256 of a client IP. Returns null for empty/unknown input — never hash a placeholder as if it were real. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null
  return hash(ip.toLowerCase())
}

/** HMAC-SHA256 of a raw User-Agent string. */
export function hashUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null
  return hash(userAgent)
}

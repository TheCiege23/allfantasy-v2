/**
 * Phase 5 — Internal-user detection for Chimmy intelligence QA surfaces.
 *
 * Wraps the existing `isAllFantasyTestEmail` admin/test allowlist so the rest
 * of the chimmy-context code never has to know about admin internals. Pure;
 * never throws; safe to call from server code.
 *
 * "Internal user" means: a member of the AF test/admin allowlist OR a user
 * matching the active Chimmy context-engine canary allowlist. These users see
 * the internal QA UI and are allowed to POST feedback/interaction events.
 */

import { isAllFantasyTestEmail, isAllFantasyTestUsername } from "@/lib/auth/admin"

export type InternalUserInput = {
  userId?: string | null
  userEmail?: string | null
  username?: string | null
}

function parseCsvLower(raw: string | undefined): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0)
  )
}

/**
 * True when the caller is an internal/AF test user OR matches the active
 * Chimmy canary allowlist by id or email.
 *
 * Reads env directly (default `process.env`) so this can be unit-tested with
 * a synthetic env. Never throws.
 */
export function isInternalChimmyUser(
  input: InternalUserInput,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const email = (input?.userEmail ?? "").trim().toLowerCase()
  const userId = (input?.userId ?? "").trim().toLowerCase()
  const username = (input?.username ?? "").trim()

  if (email && isAllFantasyTestEmail(email)) return true
  if (username && isAllFantasyTestUsername(username)) return true

  const canaryAllow = parseCsvLower(env.CHIMMY_CONTEXT_ENGINE_ALLOWLIST)
  if (canaryAllow.size > 0) {
    if (userId && canaryAllow.has(userId)) return true
    if (email && canaryAllow.has(email)) return true
  }

  return false
}

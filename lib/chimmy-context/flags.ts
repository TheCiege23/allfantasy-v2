/**
 * Phase 3A.2 — Chimmy context engine activation flags.
 *
 * Pure helpers around env-driven canary activation for the Chimmy context
 * injection path. Behavior matrix (first match wins):
 *
 *   1. CHIMMY_CONTEXT_ENGINE_INJECT === "1"           → eligible (global on).
 *   2. CHIMMY_CONTEXT_ENGINE_CANARY === "1" AND
 *      a. allowlist match by user id / email          → eligible (allowlist).
 *      b. deterministic per-user rollout bucket < pct → eligible (rollout).
 *   3. Otherwise                                      → not eligible.
 *
 * The function NEVER throws and NEVER touches I/O. It only reads `process.env`
 * (read-only). All thresholds + lists are env-driven so canary state can be
 * adjusted without redeploys (when the platform supports it).
 *
 * NOT a feature flag for *enabling Chimmy as a product* — only for routing
 * traffic to the new context-engine prompt path.
 */

export type CanaryReason = "global" | "allowlist" | "rollout" | "off"

export type CanaryDecision = {
  /** True when the new context-engine prompt path should run. */
  eligible: boolean
  /** Why the decision was made (telemetry surface). */
  reason: CanaryReason
  /** Deterministic 0-99 bucket assigned to this user (null when no userId). */
  rolloutBucket: number | null
  /** Effective rollout percent the bucket was compared against (0-100). */
  rolloutPct: number
}

type Input = {
  userId: string | null | undefined
  userEmail?: string | null
}

function parseCsvList(raw: string | undefined): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0)
  )
}

function parsePct(raw: string | undefined): number {
  if (!raw) return 0
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

/**
 * Deterministic 0-99 bucket from a stable identifier. Uses a tiny FNV-1a
 * variant so the same userId always maps to the same bucket without any
 * dependency or randomness.
 */
export function rolloutBucketFor(stableId: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < stableId.length; i++) {
    h ^= stableId.charCodeAt(i)
    // Math.imul keeps result 32-bit safe across JS engines.
    h = Math.imul(h, 0x01000193)
  }
  // Unsigned shift to keep positive, then mod 100.
  return (h >>> 0) % 100
}

/**
 * Decide whether the new Chimmy context-engine prompt path should run for
 * this user. Pure. Never throws.
 */
export function shouldInjectChimmyContext(
  input: Input,
  env: NodeJS.ProcessEnv = process.env
): CanaryDecision {
  const pct = parsePct(env.CHIMMY_CONTEXT_ENGINE_ROLLOUT_PCT)
  const userId = (input?.userId ?? "").trim()
  const userEmail = (input?.userEmail ?? "").trim().toLowerCase()
  const bucket = userId ? rolloutBucketFor(userId) : null

  // 1) Global on (preserves prior behavior exactly).
  if (env.CHIMMY_CONTEXT_ENGINE_INJECT === "1") {
    return { eligible: true, reason: "global", rolloutBucket: bucket, rolloutPct: pct }
  }

  // 2) Canary mode.
  if (env.CHIMMY_CONTEXT_ENGINE_CANARY === "1") {
    const allow = parseCsvList(env.CHIMMY_CONTEXT_ENGINE_ALLOWLIST)
    if (allow.size > 0) {
      if (userId && allow.has(userId.toLowerCase())) {
        return { eligible: true, reason: "allowlist", rolloutBucket: bucket, rolloutPct: pct }
      }
      if (userEmail && allow.has(userEmail)) {
        return { eligible: true, reason: "allowlist", rolloutBucket: bucket, rolloutPct: pct }
      }
    }
    if (pct > 0 && bucket != null && bucket < pct) {
      return { eligible: true, reason: "rollout", rolloutBucket: bucket, rolloutPct: pct }
    }
  }

  return { eligible: false, reason: "off", rolloutBucket: bucket, rolloutPct: pct }
}

/**
 * Phase 5 — explicit cohort label for telemetry slicing and operator UI.
 *
 * Stable, compact strings (≤24 chars to fit the feedback table column):
 *   - "global_on"          → forced on for everyone
 *   - "internal_allowlist" → matched canary allowlist
 *   - "canary_{N}pct"      → matched rollout bucket at N% (e.g. "canary_5pct")
 *   - "off"                → not eligible
 *
 * Derives cleanly from `CanaryDecision` so callers don't re-implement logic.
 */
export function getCanaryCohort(decision: CanaryDecision): string {
  switch (decision.reason) {
    case "global":
      return "global_on"
    case "allowlist":
      return "internal_allowlist"
    case "rollout": {
      const pct = Math.max(0, Math.min(100, Math.trunc(decision.rolloutPct)))
      return `canary_${pct}pct`
    }
    case "off":
    default:
      return "off"
  }
}


/**
 * Phase 6F — Commissioner preference layer.
 *
 * Pure helpers around `CommissionerPreferences`:
 *   - Normalise / clamp raw inputs from a (future) admin surface.
 *   - Pre-filter candidate pools cheaply before scoring.
 *   - Generate compact human-readable summaries for the league card.
 *
 * No DB access — callers compose with persistence elsewhere.
 */

import type { CommissionerPreferences, LeagueFitCandidate } from "./types"

function clamp01OrNull(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v)) return null
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

function clampDifficultyBand(
  band: [number, number] | null | undefined
): [number, number] | null {
  if (!band) return null
  const [lo, hi] = band
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null
  const a = Math.max(0, Math.min(10_000, Math.floor(lo)))
  const b = Math.max(0, Math.min(10_000, Math.floor(hi)))
  return a <= b ? [a, b] : [b, a]
}

/**
 * Sanitize raw commissioner input. Strips out-of-range numbers, normalises
 * arrays, and drops unknown fields. Returns `null` if all fields are
 * blank — saves the caller from persisting an empty record.
 */
export function normalizeCommissionerPreferences(
  raw: Partial<CommissionerPreferences> | null | undefined
): CommissionerPreferences | null {
  if (!raw || typeof raw !== "object") return null
  const out: CommissionerPreferences = {
    competitivenessMin: clamp01OrNull(raw.competitivenessMin),
    activityMin: clamp01OrNull(raw.activityMin),
    credibilityMin: clamp01OrNull(raw.credibilityMin),
    difficultyBand: clampDifficultyBand(raw.difficultyBand ?? null),
    preferredLeagueTypes:
      Array.isArray(raw.preferredLeagueTypes) && raw.preferredLeagueTypes.length > 0
        ? Array.from(
            new Set(
              raw.preferredLeagueTypes
                .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
                .map((v) => v.trim().toLowerCase())
            )
          )
        : null,
    verifiedOnly: raw.verifiedOnly === true ? true : null,
  }
  const isEmpty =
    out.competitivenessMin == null &&
    out.activityMin == null &&
    out.credibilityMin == null &&
    out.difficultyBand == null &&
    (out.preferredLeagueTypes?.length ?? 0) === 0 &&
    out.verifiedOnly == null
  return isEmpty ? null : out
}

/**
 * Cheap pre-filter — applies hard rejects before scoring. Identical
 * logic to the per-candidate gate inside `compatibility.ts`, exposed
 * separately so callers can short-circuit large pools.
 */
export function preFilterCandidates(
  candidates: ReadonlyArray<LeagueFitCandidate>,
  prefs: CommissionerPreferences | null | undefined
): LeagueFitCandidate[] {
  if (!prefs) return candidates.slice()
  return candidates.filter((c) => {
    if (prefs.verifiedOnly && !c.verified) return false
    if (prefs.credibilityMin != null && c.credibilityScore < prefs.credibilityMin) return false
    const p = c.profile
    if (p) {
      if (prefs.activityMin != null && p.activityScore < prefs.activityMin) return false
      if (prefs.competitivenessMin != null && p.competitivenessIndex < prefs.competitivenessMin)
        return false
    }
    return true
  })
}

/**
 * Compact human-readable summary, e.g.
 *   "Verified only · 70%+ credibility · Competitive bar 60%".
 * Empty string when no preferences are set.
 */
export function describePreferences(
  prefs: CommissionerPreferences | null | undefined
): string {
  if (!prefs) return ""
  const parts: string[] = []
  if (prefs.verifiedOnly) parts.push("Verified only")
  if (prefs.credibilityMin != null) {
    parts.push(`${Math.round(prefs.credibilityMin * 100)}%+ credibility`)
  }
  if (prefs.activityMin != null) {
    parts.push(`${Math.round(prefs.activityMin * 100)}%+ activity`)
  }
  if (prefs.competitivenessMin != null) {
    parts.push(`${Math.round(prefs.competitivenessMin * 100)}%+ competitiveness`)
  }
  if (prefs.difficultyBand) {
    parts.push(`difficulty ${prefs.difficultyBand[0]}–${prefs.difficultyBand[1]}`)
  }
  if (prefs.preferredLeagueTypes?.length) {
    parts.push(prefs.preferredLeagueTypes.join("/"))
  }
  return parts.join(" · ")
}

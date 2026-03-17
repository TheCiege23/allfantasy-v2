/**
 * Validates commissioner settings before save.
 * Sport-aware (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER).
 */

import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import type { LeagueSport } from "@prisma/client"
import type { LeagueSettingsPatch } from "./types"

export type ValidationResult = { valid: true } | { valid: false; error: string }

export function validateGeneralSettings(patch: LeagueSettingsPatch): ValidationResult {
  if (patch.name !== undefined) {
    const name = typeof patch.name === "string" ? patch.name.trim() : ""
    if (name.length > 200) return { valid: false, error: "League name must be 200 characters or less" }
  }
  if (patch.description !== undefined && patch.description != null) {
    if (typeof patch.description !== "string") return { valid: false, error: "Description must be a string" }
    if (patch.description.length > 2000) return { valid: false, error: "Description must be 2000 characters or less" }
  }
  if (patch.sport !== undefined && patch.sport != null) {
    const s = String(patch.sport).toUpperCase()
    if (!(SUPPORTED_SPORTS as readonly string[]).includes(s)) {
      return { valid: false, error: `Sport must be one of: ${SUPPORTED_SPORTS.join(", ")}` }
    }
  }
  if (patch.season !== undefined && patch.season != null) {
    const y = Number(patch.season)
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      return { valid: false, error: "Season must be a year between 2000 and 2100" }
    }
  }
  return { valid: true }
}

export function validateRosterSettings(patch: LeagueSettingsPatch): ValidationResult {
  if (patch.rosterSize !== undefined && patch.rosterSize != null) {
    const n = Number(patch.rosterSize)
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return { valid: false, error: "Roster size must be between 1 and 100" }
    }
  }
  if (patch.leagueSize !== undefined && patch.leagueSize != null) {
    const n = Number(patch.leagueSize)
    if (!Number.isInteger(n) || n < 2 || n > 32) {
      return { valid: false, error: "League size must be between 2 and 32" }
    }
  }
  return { valid: true }
}

export function validateTradeSettings(patch: LeagueSettingsPatch): ValidationResult {
  if (patch.vetoThreshold !== undefined && patch.vetoThreshold != null) {
    const n = Number(patch.vetoThreshold)
    if (!Number.isInteger(n) || n < 0 || n > 100) {
      return { valid: false, error: "Veto threshold must be 0–100" }
    }
  }
  return { valid: true }
}

export function validateCommissionerPatch(patch: LeagueSettingsPatch): ValidationResult {
  const g = validateGeneralSettings(patch)
  if (!g.valid) return g
  const r = validateRosterSettings(patch)
  if (!r.valid) return r
  return validateTradeSettings(patch)
}

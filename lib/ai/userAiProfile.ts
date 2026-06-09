/**
 * UserAiProfile — how to talk to this user and what they care about.
 *
 * Reads/writes from existing UserProfile columns — no migration needed:
 *   skillLevel      ← UserProfile.aiStrategyModeDefault
 *   riskStyle       ← UserProfile.riskProfile
 *   favoriteSports  ← UserProfile.preferredSports
 *   explanationStyle← UserProfile.aiExplanationStyle
 *
 * All fields are optional. Null means "not set" — callers fall back to
 * product-level defaults (e.g. "intermediate" skill, "balanced" risk).
 *
 * ── How the profile shapes AI responses ──────────────────────────────────────
 *  skillLevel:
 *    beginner    → shorter answers, no jargon, explain basic concepts
 *    intermediate→ standard depth (default)
 *    advanced    → deeper analysis, assume league knowledge, larger model
 *
 *  riskStyle:
 *    conservative → prefer safe picks, warn loudly about busts
 *    balanced     → standard strategy guidance (default)
 *    aggressive   → lean into contrarian plays, accept variance
 *
 *  explanationStyle:
 *    concise  → bullet points, no preamble
 *    teaching → structured TeachingAnswer format with Edge/Avoid sections
 *    detailed → narrative paragraphs with full context
 */
import "server-only"

import { prisma } from "@/lib/prisma"

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserSkillLevel = "beginner" | "intermediate" | "advanced"
export type UserRiskStyle = "conservative" | "balanced" | "aggressive"
export type UserExplanationStyle = "concise" | "teaching" | "detailed"

/** The AI persona profile for a single user. All fields are nullable. */
export type UserAiProfile = {
  userId: string
  /** How deep should AI explanations go? */
  skillLevel: UserSkillLevel | null
  /** How much variance/contrarianism should AI recommendations lean toward? */
  riskStyle: UserRiskStyle | null
  /** Which sports does this user primarily care about? */
  favoriteSports: string[]
  /** Which response format does this user prefer? */
  explanationStyle: UserExplanationStyle | null
  /** When this profile was last updated. */
  updatedAt: Date | null
}

/** Defaults used when a field is not set in the profile. */
export const USER_AI_PROFILE_DEFAULTS = {
  skillLevel: "intermediate" as UserSkillLevel,
  riskStyle: "balanced" as UserRiskStyle,
  explanationStyle: "teaching" as UserExplanationStyle,
  favoriteSports: [] as string[],
}

// ─── Validators ───────────────────────────────────────────────────────────────

const VALID_SKILL_LEVELS = new Set<string>(["beginner", "intermediate", "advanced"])
const VALID_RISK_STYLES = new Set<string>(["conservative", "balanced", "aggressive"])
const VALID_EXPLANATION_STYLES = new Set<string>(["concise", "teaching", "detailed"])

function parseSkillLevel(raw: string | null | undefined): UserSkillLevel | null {
  if (!raw) return null
  return VALID_SKILL_LEVELS.has(raw) ? (raw as UserSkillLevel) : null
}

function parseRiskStyle(raw: string | null | undefined): UserRiskStyle | null {
  if (!raw) return null
  return VALID_RISK_STYLES.has(raw) ? (raw as UserRiskStyle) : null
}

function parseExplanationStyle(raw: string | null | undefined): UserExplanationStyle | null {
  if (!raw) return null
  return VALID_EXPLANATION_STYLES.has(raw) ? (raw as UserExplanationStyle) : null
}

function parseFavoriteSports(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.filter((s) => typeof s === "string")
  }
  return []
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Load the AI profile for a user.
 *
 * Returns a fully-typed profile with nulls for unset fields.
 * Returns null if the user's profile row does not exist.
 */
export async function getUserAiProfile(userId: string): Promise<UserAiProfile | null> {
  let row: {
    aiStrategyModeDefault: string | null
    riskProfile: string | null
    preferredSports: unknown
    aiExplanationStyle: string | null
    updatedAt: Date
  } | null
  try {
    row = await (prisma as any).userProfile.findUnique({
      where: { userId },
      select: {
        aiStrategyModeDefault: true,
        riskProfile: true,
        preferredSports: true,
        aiExplanationStyle: true,
        updatedAt: true,
      },
    })
  } catch {
    return null
  }

  if (!row) return null

  return {
    userId,
    skillLevel: parseSkillLevel(row.aiStrategyModeDefault),
    riskStyle: parseRiskStyle(row.riskProfile),
    favoriteSports: parseFavoriteSports(row.preferredSports),
    explanationStyle: parseExplanationStyle(row.aiExplanationStyle),
    updatedAt: row.updatedAt,
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

export type UpdateUserAiProfileInput = {
  skillLevel?: UserSkillLevel | null
  riskStyle?: UserRiskStyle | null
  favoriteSports?: string[]
  explanationStyle?: UserExplanationStyle | null
}

/**
 * Update the AI profile fields for a user.
 *
 * Only the fields present in the input are updated (partial update).
 * Returns the updated profile, or null on DB error.
 */
export async function updateUserAiProfile(
  userId: string,
  update: UpdateUserAiProfileInput
): Promise<UserAiProfile | null> {
  const data: Record<string, unknown> = {}

  if ("skillLevel" in update) {
    const validated = parseSkillLevel(update.skillLevel ?? null)
    data.aiStrategyModeDefault = validated
  }
  if ("riskStyle" in update) {
    const validated = parseRiskStyle(update.riskStyle ?? null)
    data.riskProfile = validated
  }
  if ("favoriteSports" in update && update.favoriteSports !== undefined) {
    data.preferredSports = update.favoriteSports
  }
  if ("explanationStyle" in update) {
    const validated = parseExplanationStyle(update.explanationStyle ?? null)
    data.aiExplanationStyle = validated
  }

  if (Object.keys(data).length === 0) {
    // Nothing to update — return current profile
    return getUserAiProfile(userId)
  }

  try {
    const row = await (prisma as any).userProfile.update({
      where: { userId },
      data,
      select: {
        aiStrategyModeDefault: true,
        riskProfile: true,
        preferredSports: true,
        aiExplanationStyle: true,
        updatedAt: true,
      },
    })
    return {
      userId,
      skillLevel: parseSkillLevel(row.aiStrategyModeDefault),
      riskStyle: parseRiskStyle(row.riskProfile),
      favoriteSports: parseFavoriteSports(row.preferredSports),
      explanationStyle: parseExplanationStyle(row.aiExplanationStyle),
      updatedAt: row.updatedAt,
    }
  } catch {
    return null
  }
}

// ─── Effective profile (with defaults) ───────────────────────────────────────

/** A `UserAiProfile` with all nulls replaced by product defaults. */
export type EffectiveUserAiProfile = {
  userId: string
  skillLevel: UserSkillLevel
  riskStyle: UserRiskStyle
  favoriteSports: string[]
  explanationStyle: UserExplanationStyle
}

/**
 * Returns the profile with defaults filled in.
 * Useful for prompt building where you always want a concrete value.
 */
export function applyProfileDefaults(profile: UserAiProfile | null, userId: string): EffectiveUserAiProfile {
  return {
    userId: profile?.userId ?? userId,
    skillLevel: profile?.skillLevel ?? USER_AI_PROFILE_DEFAULTS.skillLevel,
    riskStyle: profile?.riskStyle ?? USER_AI_PROFILE_DEFAULTS.riskStyle,
    favoriteSports: profile?.favoriteSports ?? USER_AI_PROFILE_DEFAULTS.favoriteSports,
    explanationStyle: profile?.explanationStyle ?? USER_AI_PROFILE_DEFAULTS.explanationStyle,
  }
}

// ─── System prompt personalization ───────────────────────────────────────────

/**
 * Build a short system prompt addendum that personalizes Chimmy's tone
 * based on the user's effective AI profile.
 *
 * Appended after grounding instructions; does NOT override safety rules.
 */
export function buildPersonalizationSuffix(profile: EffectiveUserAiProfile): string {
  const lines: string[] = []

  // Skill level
  if (profile.skillLevel === "beginner") {
    lines.push("This user is new to fantasy — use plain language, avoid jargon, and explain any terms you use.")
  } else if (profile.skillLevel === "advanced") {
    lines.push("This user is an experienced fantasy player — you can skip basic explanations and go straight to the strategic insight.")
  }

  // Risk style
  if (profile.riskStyle === "conservative") {
    lines.push("This user prefers safe, stable picks — highlight bust risk prominently and lead with the cautious option.")
  } else if (profile.riskStyle === "aggressive") {
    lines.push("This user embraces variance — lean into contrarian plays and call out where differentiation upside exists.")
  }

  // Explanation style
  if (profile.explanationStyle === "concise") {
    lines.push("Keep the response brief: 2-3 sentences maximum. No preamble.")
  } else if (profile.explanationStyle === "detailed") {
    lines.push("This user appreciates context — give a fuller explanation with relevant background.")
  }

  if (lines.length === 0) return ""

  return [
    "",
    "── USER PREFERENCES ────────────────────────────────────────────────────────",
    ...lines,
    "────────────────────────────────────────────────────────────────────────────",
  ].join("\n")
}

import { updateUserProfile } from "@/lib/user-settings/UserProfileService"
import { getSettingsProfile } from "@/lib/user-settings/SettingsQueryService"
import type { PreferredSportCode } from "@/lib/user-settings/types"
import { isSupportedSport } from "@/lib/sport-scope"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"

/**
 * Resolves and persists user preferences from onboarding (e.g. preferred sports).
 * Integrates with UserProfile.preferredSports and existing profile PATCH.
 */
export async function getPreferredSports(userId: string): Promise<PreferredSportCode[]> {
  const profile = await getSettingsProfile(userId)
  const raw = profile?.preferredSports ?? null
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw.filter((s): s is PreferredSportCode => typeof s === "string" && isSupportedSport(s))
}

/**
 * Saves preferred sports from onboarding; validates against SUPPORTED_SPORTS.
 */
export async function setPreferredSports(
  userId: string,
  sports: PreferredSportCode[]
): Promise<{ ok: boolean; error?: string }> {
  const valid = sports.filter((s) => isSupportedSport(s))
  const unique = [...new Set(valid)]
  return updateUserProfile(userId, { preferredSports: unique.length > 0 ? unique : null })
}

/**
 * Returns sport options for onboarding (labels + values from SUPPORTED_SPORTS).
 */
export function getSportOptions(): { value: string; label: string }[] {
  const labels: Record<string, string> = {
    NFL: "NFL",
    NHL: "NHL",
    NBA: "NBA",
    MLB: "MLB",
    NCAAF: "NCAA Football",
    NCAAB: "NCAA Basketball",
    SOCCER: "Soccer",
  }
  return SUPPORTED_SPORTS.map((s) => ({ value: s, label: labels[s] ?? s }))
}

import { getSettingsProfile } from "./SettingsQueryService"
import type { UserProfileForSettings } from "./types"

/**
 * Profile page service: returns full editable profile for the current user.
 * Used by /profile (own profile) to render and edit.
 */
export async function getProfilePageData(
  userId: string
): Promise<UserProfileForSettings | null> {
  return getSettingsProfile(userId)
}

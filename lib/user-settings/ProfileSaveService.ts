import { updateUserProfile } from "./UserProfileService"
import type { ProfileUpdatePayload } from "./types"

/**
 * Profile save orchestration. Validates and persists profile updates from profile page or settings.
 */
export async function saveProfile(
  userId: string,
  payload: ProfileUpdatePayload
): Promise<{ ok: boolean; error?: string }> {
  return updateUserProfile(userId, payload)
}

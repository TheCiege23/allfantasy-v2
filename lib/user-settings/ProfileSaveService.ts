import { saveSettingsOrchestrated } from "./SettingsSaveOrchestrator"
import type { ProfileUpdatePayload } from "./types"

/**
 * Profile save orchestration. Validates and persists profile updates from profile page or settings.
 */
export async function saveProfile(
  userId: string,
  payload: ProfileUpdatePayload
): Promise<{ ok: boolean; error?: string }> {
  const result = await saveSettingsOrchestrated({
    userId,
    payload: { profile: payload },
  })
  return { ok: result.ok, error: result.error }
}

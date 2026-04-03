import type { ProfileUpdatePayload, UserProfileForSettings } from "@/lib/user-settings/types"

/** Profile snapshot used by settings sections (null only during edge cases). */
export type SettingsProfile = UserProfileForSettings | null

export type SettingsOnSave = (payload: ProfileUpdatePayload) => Promise<boolean>

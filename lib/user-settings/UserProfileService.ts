import { prisma } from "@/lib/prisma"
import type { ProfileUpdatePayload } from "./types"

/**
 * Updates user profile fields that are editable from Settings.
 * Does not update email/phone/username without verification flows.
 */
export async function updateUserProfile(
  userId: string,
  payload: ProfileUpdatePayload
): Promise<{ ok: boolean; error?: string }> {
  if (!payload.displayName && payload.displayName !== null && payload.displayName !== undefined) {
    // allow clearing displayName
  }
  const updateProfile: Record<string, unknown> = {}
  if (payload.displayName !== undefined) updateProfile.displayName = payload.displayName?.trim() || null
  if (payload.preferredLanguage !== undefined) updateProfile.preferredLanguage = payload.preferredLanguage || null
  if (payload.timezone !== undefined) updateProfile.timezone = payload.timezone || null
  if (payload.themePreference !== undefined) updateProfile.themePreference = payload.themePreference || null
  if (payload.avatarPreset !== undefined) updateProfile.avatarPreset = payload.avatarPreset || null
  if (payload.bio !== undefined) updateProfile.bio = payload.bio?.trim() || null
  if (payload.preferredSports !== undefined)
    updateProfile.preferredSports = Array.isArray(payload.preferredSports) && payload.preferredSports.length > 0
      ? payload.preferredSports
      : null
  if (payload.notificationPreferences !== undefined)
    updateProfile.notificationPreferences = payload.notificationPreferences ?? null

  try {
    await prisma.userProfile.upsert({
      where: { userId },
      update: updateProfile as Parameters<typeof prisma.userProfile.upsert>[0]['update'],
      create: {
        userId,
        ...updateProfile,
      } as Parameters<typeof prisma.userProfile.upsert>[0]['create'],
    })

    const appUserUpdate: Record<string, unknown> = {}
    if (payload.displayName !== undefined && payload.displayName?.trim()) {
      appUserUpdate.displayName = payload.displayName.trim()
    }
    if (payload.avatarUrl !== undefined) {
      appUserUpdate.avatarUrl = payload.avatarUrl || null
    }
    if (Object.keys(appUserUpdate).length > 0) {
      await prisma.appUser.update({
        where: { id: userId },
        data: appUserUpdate,
      })
    }

    return { ok: true }
  } catch (e) {
    console.error("[UserProfileService] updateUserProfile error:", e)
    return { ok: false, error: "Failed to save profile" }
  }
}

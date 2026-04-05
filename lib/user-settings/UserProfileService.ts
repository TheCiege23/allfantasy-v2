import { prisma } from "@/lib/prisma"
import { isAllowedSessionIdleMinutes } from "@/lib/auth/session-idle-constants"
import { SUPPORTED_SPORTS, isSupportedSport } from "@/lib/sport-scope"
import type { ProfileUpdatePayload } from "./types"

/**
 * Updates user profile fields that are editable from Settings.
 * Username can be changed here (validated + uniqueness). Email/phone use dedicated flows.
 */
const USERNAME_RE = /^[a-z0-9_]{3,32}$/

export async function updateUserProfile(
  userId: string,
  payload: ProfileUpdatePayload
): Promise<{ ok: boolean; error?: string }> {
  if (payload.username !== undefined && payload.username !== null) {
    const normalized = String(payload.username).trim().toLowerCase()
    if (!USERNAME_RE.test(normalized)) {
      return {
        ok: false,
        error: "Username must be 3–32 characters (lowercase letters, numbers, underscore)",
      }
    }
    const taken = await prisma.appUser.findFirst({
      where: { username: normalized, NOT: { id: userId } },
      select: { id: true },
    })
    if (taken) {
      return { ok: false, error: "Username is already taken" }
    }
    try {
      await prisma.appUser.update({
        where: { id: userId },
        data: { username: normalized },
      })
    } catch {
      return { ok: false, error: "Failed to update username" }
    }
  }

  const updateProfile: Record<string, unknown> = {}
  if (payload.displayName !== undefined) updateProfile.displayName = payload.displayName?.trim() || null
  if (payload.preferredLanguage !== undefined) updateProfile.preferredLanguage = payload.preferredLanguage || null
  if (payload.timezone !== undefined) updateProfile.timezone = payload.timezone || null
  if (payload.themePreference !== undefined) updateProfile.themePreference = payload.themePreference || null
  if (payload.avatarPreset !== undefined) updateProfile.avatarPreset = payload.avatarPreset || null
  if (payload.bio !== undefined) updateProfile.bio = payload.bio?.trim() || null
  if (payload.preferredSports !== undefined) {
    const normalizedSports =
      Array.isArray(payload.preferredSports) && payload.preferredSports.length > 0
        ? SUPPORTED_SPORTS.filter((sport) =>
            payload.preferredSports?.some(
              (candidate) =>
                isSupportedSport(String(candidate).toUpperCase()) &&
                String(candidate).toUpperCase() === sport
            )
          )
        : []
    updateProfile.preferredSports =
      normalizedSports.length > 0 ? normalizedSports : null
  }
  if (payload.notificationPreferences !== undefined)
    updateProfile.notificationPreferences = payload.notificationPreferences ?? null
  if (payload.clearSleeperLink === true) {
    updateProfile.sleeperUsername = null
    updateProfile.sleeperLinkedAt = null
    updateProfile.sleeperUserId = null
    updateProfile.sleeperVerifiedAt = null
  }
  if (payload.onboardingStep !== undefined) updateProfile.onboardingStep = payload.onboardingStep ?? null
  if (payload.onboardingCompletedAt !== undefined)
    updateProfile.onboardingCompletedAt = payload.onboardingCompletedAt ?? null
  if (payload.sessionIdleTimeoutMinutes !== undefined) {
    const v = payload.sessionIdleTimeoutMinutes
    if (v === null || v === 0) {
      updateProfile.sessionIdleTimeoutMinutes = null
    } else if (isAllowedSessionIdleMinutes(v)) {
      updateProfile.sessionIdleTimeoutMinutes = v
    } else {
      return { ok: false, error: "Invalid session timeout value" }
    }
  }

  try {
    if (Object.keys(updateProfile).length > 0) {
      await prisma.userProfile.upsert({
        where: { userId },
        update: updateProfile as Parameters<typeof prisma.userProfile.upsert>[0]["update"],
        create: {
          userId,
          ...updateProfile,
        } as Parameters<typeof prisma.userProfile.upsert>[0]["create"],
      })
    }

    const appUserUpdate: Record<string, unknown> = {}
    if (payload.displayName !== undefined) {
      appUserUpdate.displayName = payload.displayName?.trim() || null
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

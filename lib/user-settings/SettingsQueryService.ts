import { prisma } from "@/lib/prisma"
import { getUserSettingsRecord } from "./UserSettingsService"
import { resolveSharedProfileBootstrap } from "./SharedProfileBootstrapService"
import { updateUserProfile } from "./UserProfileService"
import type { SettingsSnapshot, UserProfileForSettings } from "./types"

/**
 * Fetches the full profile and account data needed for the settings UI.
 * Used by Settings page and SettingsModal.
 */
async function queryBaseProfile(
  userId: string
): Promise<Omit<UserProfileForSettings, "settings"> | null> {
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerified: true,
      displayName: true,
      avatarUrl: true,
      passwordHash: true,
      profile: {
        select: {
          displayName: true,
          timezone: true,
          preferredLanguage: true,
          themePreference: true,
          avatarPreset: true,
          phone: true,
          phoneVerifiedAt: true,
          emailVerifiedAt: true,
          ageConfirmedAt: true,
          verificationMethod: true,
          profileComplete: true,
          sleeperUsername: true,
          sleeperLinkedAt: true,
          discordUserId: true,
          discordUsername: true,
          discordEmail: true,
          discordAvatar: true,
          discordGuildId: true,
          discordConnectedAt: true,
          bio: true,
          preferredSports: true,
          notificationPreferences: true,
          onboardingStep: true,
          onboardingCompletedAt: true,
          sessionIdleTimeoutMinutes: true,
          updatedAt: true,
        },
      },
    },
  })

  if (!user) return null

  const profile = user.profile
  const preferredLanguage =
    profile?.preferredLanguage === "es" || profile?.preferredLanguage === "en"
      ? (profile.preferredLanguage as "en" | "es")
      : null
  const resolvedEmailVerifiedAt = profile?.emailVerifiedAt ?? user.emailVerified ?? null

  return {
    userId: user.id,
    username: user.username,
    email: user.email ?? null,
    displayName: profile?.displayName ?? user.displayName ?? null,
    profileImageUrl: user.avatarUrl ?? null,
    avatarPreset: profile?.avatarPreset ?? null,
    preferredLanguage,
    timezone: profile?.timezone ?? null,
    themePreference: (profile?.themePreference as "dark" | "light" | "legacy") ?? null,
    phone: profile?.phone ?? null,
    phoneVerifiedAt: profile?.phoneVerifiedAt ?? null,
    emailVerifiedAt: resolvedEmailVerifiedAt,
    ageConfirmedAt: profile?.ageConfirmedAt ?? null,
    verificationMethod:
      profile?.verificationMethod === "PHONE" || profile?.verificationMethod === "EMAIL"
        ? profile.verificationMethod
        : null,
    hasPassword: !!(user as any).passwordHash,
    profileComplete: profile?.profileComplete ?? false,
    sleeperUsername: profile?.sleeperUsername ?? null,
    sleeperLinkedAt: profile?.sleeperLinkedAt ?? null,
    discordUserId: profile?.discordUserId ?? null,
    discordUsername: profile?.discordUsername ?? null,
    discordEmail: profile?.discordEmail ?? null,
    discordAvatar: profile?.discordAvatar ?? null,
    discordGuildId: profile?.discordGuildId ?? null,
    discordConnectedAt: profile?.discordConnectedAt ?? null,
    bio: profile?.bio ?? null,
    preferredSports: Array.isArray(profile?.preferredSports)
      ? (profile.preferredSports as string[])
      : profile?.preferredSports
        ? [profile.preferredSports as string]
        : null,
    notificationPreferences: (profile?.notificationPreferences as Record<string, unknown> | null) ?? null,
    onboardingStep: profile?.onboardingStep ?? null,
    onboardingCompletedAt: profile?.onboardingCompletedAt ?? null,
    sessionIdleTimeoutMinutes:
      typeof profile?.sessionIdleTimeoutMinutes === "number"
        ? profile.sessionIdleTimeoutMinutes
        : null,
    updatedAt: profile?.updatedAt ?? new Date(),
  }
}

export async function getSettingsSnapshot(
  userId: string
): Promise<SettingsSnapshot | null> {
  const baseProfile = await queryBaseProfile(userId)
  if (!baseProfile) return null

  const bootstrapped = resolveSharedProfileBootstrap({
    profile: baseProfile,
  })

  if (Object.keys(bootstrapped.patchPayload).length > 0) {
    await updateUserProfile(userId, bootstrapped.patchPayload)
  }

  const profileWithSettingsPlaceholder: UserProfileForSettings = {
    ...bootstrapped.profile,
    settings: null,
  }

  const settings = await getUserSettingsRecord(
    userId,
    profileWithSettingsPlaceholder
  )

  const profile: UserProfileForSettings = {
    ...profileWithSettingsPlaceholder,
    settings,
  }

  return {
    profile,
    settings,
  }
}

export async function getSettingsProfile(
  userId: string
): Promise<UserProfileForSettings | null> {
  const snapshot = await getSettingsSnapshot(userId)
  return snapshot?.profile ?? null
}

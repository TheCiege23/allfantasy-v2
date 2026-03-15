import { prisma } from "@/lib/prisma"
import type { UserProfileForSettings } from "./types"

/**
 * Fetches the full profile and account data needed for the settings UI.
 * Used by Settings page and SettingsModal.
 */
export async function getSettingsProfile(userId: string): Promise<UserProfileForSettings | null> {
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
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
          profileComplete: true,
          sleeperUsername: true,
          sleeperLinkedAt: true,
          bio: true,
          preferredSports: true,
          notificationPreferences: true,
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
    emailVerifiedAt: profile?.emailVerifiedAt ?? null,
    hasPassword: !!(user as any).passwordHash,
    profileComplete: profile?.profileComplete ?? false,
    sleeperUsername: profile?.sleeperUsername ?? null,
    sleeperLinkedAt: profile?.sleeperLinkedAt ?? null,
    bio: profile?.bio ?? null,
    preferredSports: Array.isArray(profile?.preferredSports)
      ? (profile.preferredSports as string[])
      : profile?.preferredSports
        ? [profile.preferredSports as string]
        : null,
    notificationPreferences: (profile?.notificationPreferences as Record<string, unknown> | null) ?? null,
    updatedAt: profile?.updatedAt ?? new Date(),
  }
}

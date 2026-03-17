/**
 * Types for the unified user settings and profile system.
 * Used across Sports App, Bracket Challenge, and AllFantasy Legacy.
 */

export type ThemePreference = "dark" | "light" | "legacy"
export type PreferredLanguage = "en" | "es"

/** Supported sport code (aligns with LeagueSport). */
export type PreferredSportCode = string

export interface UserProfileForSettings {
  userId: string
  username: string
  email: string | null
  displayName: string | null
  profileImageUrl: string | null
  avatarPreset: string | null
  preferredLanguage: PreferredLanguage | null
  timezone: string | null
  themePreference: ThemePreference | null
  phone: string | null
  phoneVerifiedAt: Date | null
  emailVerifiedAt: Date | null
  hasPassword: boolean
  profileComplete: boolean
  sleeperUsername: string | null
  sleeperLinkedAt: Date | null
  bio: string | null
  preferredSports: PreferredSportCode[] | null
  /** Notification preferences (NotificationPreferences shape from lib/notification-settings). */
  notificationPreferences: Record<string, unknown> | null
  onboardingStep: string | null
  onboardingCompletedAt: Date | null
  updatedAt: Date
}

export interface ProfileUpdatePayload {
  displayName?: string | null
  preferredLanguage?: PreferredLanguage | null
  timezone?: string | null
  themePreference?: ThemePreference | null
  avatarPreset?: string | null
  avatarUrl?: string | null
  bio?: string | null
  preferredSports?: PreferredSportCode[] | null
  notificationPreferences?: Record<string, unknown> | null
  onboardingStep?: string | null
  onboardingCompletedAt?: Date | null
}

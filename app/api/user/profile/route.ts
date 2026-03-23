import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getSettingsProfile,
  getSettingsSnapshot,
  saveSettingsOrchestrated,
} from "@/lib/user-settings"
import type { PreferredLanguage, ThemePreference } from "@/lib/user-settings"

export const dynamic = "force-dynamic"

/**
 * GET /api/user/profile
 * Returns full profile for settings UI; also used for preference sync (language, timezone, theme).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json(
      { preferredLanguage: null, timezone: null, themePreference: null }
    )
  }

  const snapshot = await getSettingsSnapshot(session.user.id)
  const profile = snapshot?.profile ?? null
  if (!snapshot || !profile) {
    return NextResponse.json({
      preferredLanguage: null,
      timezone: null,
      themePreference: null,
    })
  }

  return NextResponse.json({
    ...profile,
    settings: snapshot.settings,
    preferredLanguage: profile.preferredLanguage,
    timezone: profile.timezone,
    themePreference: profile.themePreference,
  })
}

/**
 * PATCH /api/user/profile
 * Update display name, language, timezone, theme, avatar preset.
 */
export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const {
    displayName,
    preferredLanguage,
    timezone,
    themePreference,
    avatarPreset,
    avatarUrl,
    bio,
    preferredSports,
    notificationPreferences,
    settings,
  } = body as {
    displayName?: string | null
    preferredLanguage?: string | null
    timezone?: string | null
    themePreference?: string | null
    avatarPreset?: string | null
    avatarUrl?: string | null
    bio?: string | null
    preferredSports?: string[] | null
    notificationPreferences?: Record<string, unknown> | null
    settings?: {
      notificationSettings?: Record<string, unknown> | null
    }
  }

  const profilePayload: Parameters<
    typeof saveSettingsOrchestrated
  >[0]["payload"]["profile"] = {}
  if (preferredLanguage !== undefined)
    profilePayload.preferredLanguage = (preferredLanguage === "es" ? "es" : preferredLanguage === "en" ? "en" : null) as PreferredLanguage | null
  if (timezone !== undefined) profilePayload.timezone = timezone ?? null
  if (themePreference !== undefined)
    profilePayload.themePreference = (themePreference === "dark" || themePreference === "light" || themePreference === "legacy"
      ? themePreference
      : null) as ThemePreference | null
  if (displayName !== undefined) profilePayload.displayName = displayName ?? null
  if (avatarPreset !== undefined) profilePayload.avatarPreset = avatarPreset ?? null
  if (avatarUrl !== undefined) profilePayload.avatarUrl = avatarUrl ?? null
  if (bio !== undefined) profilePayload.bio = bio ?? null
  if (preferredSports !== undefined)
    profilePayload.preferredSports = Array.isArray(preferredSports) ? preferredSports : null
  if (notificationPreferences !== undefined)
    profilePayload.notificationPreferences = notificationPreferences && typeof notificationPreferences === "object"
      ? notificationPreferences
      : null

  const snapshot = await getSettingsProfile(session.user.id)
  const result = await saveSettingsOrchestrated({
    userId: session.user.id,
    existingPreferenceFallback: {
      preferredLanguage: snapshot?.preferredLanguage ?? null,
      themePreference: snapshot?.themePreference ?? null,
      timezone: snapshot?.timezone ?? null,
    },
    payload: {
      profile:
        Object.keys(profilePayload ?? {}).length > 0 ? profilePayload : undefined,
      settings:
        settings?.notificationSettings !== undefined
          ? { notificationSettings: settings.notificationSettings ?? null }
          : undefined,
    },
  })
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to update profile" },
      { status: 400 }
    )
  }
  return NextResponse.json({ ok: true })
}

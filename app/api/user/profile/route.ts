import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSettingsProfile, updateUserProfile } from "@/lib/user-settings"
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

  const profile = await getSettingsProfile(session.user.id)
  if (!profile) {
    return NextResponse.json({
      preferredLanguage: null,
      timezone: null,
      themePreference: null,
    })
  }

  return NextResponse.json({
    ...profile,
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
  }

  const payload: Parameters<typeof updateUserProfile>[1] = {}
  if (displayName !== undefined) payload.displayName = displayName ?? null
  if (preferredLanguage !== undefined)
    payload.preferredLanguage = (preferredLanguage === "es" ? "es" : preferredLanguage === "en" ? "en" : null) as PreferredLanguage | null
  if (timezone !== undefined) payload.timezone = timezone ?? null
  if (themePreference !== undefined)
    payload.themePreference = (themePreference === "dark" || themePreference === "light" || themePreference === "legacy"
      ? themePreference
      : null) as ThemePreference | null
  if (avatarPreset !== undefined) payload.avatarPreset = avatarPreset ?? null
  if (avatarUrl !== undefined) payload.avatarUrl = avatarUrl ?? null
  if (bio !== undefined) payload.bio = bio ?? null
  if (preferredSports !== undefined)
    payload.preferredSports = Array.isArray(preferredSports) ? preferredSports : null
  if (notificationPreferences !== undefined)
    payload.notificationPreferences = notificationPreferences && typeof notificationPreferences === "object"
      ? notificationPreferences
      : null

  const result = await updateUserProfile(session.user.id, payload)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to update profile" },
      { status: 400 }
    )
  }
  return NextResponse.json({ ok: true })
}

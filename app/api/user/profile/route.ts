import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getSettingsProfile,
  getSettingsSnapshot,
  saveSettingsOrchestrated,
} from "@/lib/user-settings"
import type { PreferredLanguage, ThemePreference } from "@/lib/user-settings"
import type { ProfileUpdatePayload } from "@/lib/user-settings/types"

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

type ProfileBody = {
  displayName?: string | null
  username?: string | null
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
  disconnectSleeper?: boolean
  accentColor?: string | null
  fantasyPreferences?: Record<string, unknown> | null
}

async function handleProfileWrite(req: Request, userId: string) {
  const body = (await req.json().catch(() => ({}))) as ProfileBody
  const {
    displayName,
    username,
    preferredLanguage,
    timezone,
    themePreference,
    avatarPreset,
    avatarUrl,
    bio,
    preferredSports,
    notificationPreferences: rawNotificationPreferences,
    settings,
    disconnectSleeper,
    accentColor,
    fantasyPreferences,
  } = body

  const snapshot = await getSettingsProfile(userId)
  const prevNp = (snapshot?.notificationPreferences as Record<string, unknown>) ?? {}

  let mergedNotificationPreferences: Record<string, unknown> | null | undefined

  if (rawNotificationPreferences !== undefined) {
    mergedNotificationPreferences =
      rawNotificationPreferences && typeof rawNotificationPreferences === "object"
        ? { ...rawNotificationPreferences }
        : null
  }

  if (accentColor !== undefined || fantasyPreferences !== undefined) {
    const base = { ...(mergedNotificationPreferences ?? prevNp) }
    if (accentColor !== undefined) {
      base.accentColor = accentColor === null || accentColor === "" ? null : String(accentColor)
    }
    if (fantasyPreferences !== undefined) {
      if (fantasyPreferences === null) {
        base.fantasyPreferences = null
      } else if (typeof fantasyPreferences === "object") {
        base.fantasyPreferences = {
          ...(typeof base.fantasyPreferences === "object" && base.fantasyPreferences
            ? (base.fantasyPreferences as Record<string, unknown>)
            : {}),
          ...fantasyPreferences,
        }
      }
    }
    mergedNotificationPreferences = base
  }

  const profilePayload: ProfileUpdatePayload = {}

  if (preferredLanguage !== undefined)
    profilePayload.preferredLanguage = (preferredLanguage === "es"
      ? "es"
      : preferredLanguage === "en"
        ? "en"
        : null) as PreferredLanguage | null
  if (timezone !== undefined) profilePayload.timezone = timezone ?? null
  if (themePreference !== undefined)
    profilePayload.themePreference = (
      themePreference === "dark" ||
      themePreference === "light" ||
      themePreference === "legacy" ||
      themePreference === "system"
        ? themePreference
        : null
    ) as ThemePreference | null
  if (displayName !== undefined) profilePayload.displayName = displayName ?? null
  if (username !== undefined) profilePayload.username = username ?? null
  if (avatarPreset !== undefined) profilePayload.avatarPreset = avatarPreset ?? null
  if (avatarUrl !== undefined) profilePayload.avatarUrl = avatarUrl ?? null
  if (bio !== undefined) {
    const t = typeof bio === "string" ? bio.trim() : ""
    profilePayload.bio = t.length ? t.slice(0, 160) : null
  }
  if (preferredSports !== undefined)
    profilePayload.preferredSports = Array.isArray(preferredSports) ? preferredSports : null
  if (mergedNotificationPreferences !== undefined) {
    profilePayload.notificationPreferences = mergedNotificationPreferences
  }
  if (disconnectSleeper === true) {
    profilePayload.clearSleeperLink = true
  }

  const snapshotForFallback = await getSettingsProfile(userId)
  const result = await saveSettingsOrchestrated({
    userId,
    existingPreferenceFallback: {
      preferredLanguage: snapshotForFallback?.preferredLanguage ?? null,
      themePreference: snapshotForFallback?.themePreference ?? null,
      timezone: snapshotForFallback?.timezone ?? null,
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

/**
 * PATCH /api/user/profile
 * Update display name, language, timezone, theme, avatar preset, username, bio, etc.
 */
export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return handleProfileWrite(req, session.user.id)
}

/**
 * PUT /api/user/profile
 * Same behavior as PATCH (used by the settings page client).
 */
export async function PUT(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return handleProfileWrite(req, session.user.id)
}

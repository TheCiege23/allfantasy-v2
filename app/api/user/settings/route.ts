import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSettingsSnapshot, saveSettingsOrchestrated } from "@/lib/user-settings"
import type { SettingsSavePayload } from "@/lib/user-settings"

export const dynamic = "force-dynamic"

/**
 * GET /api/user/settings
 * Returns a unified settings snapshot: profile + settings sections.
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const snapshot = await getSettingsSnapshot(session.user.id)
  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(snapshot)
}

/**
 * PATCH /api/user/settings
 * Body: { profile?: ProfileUpdatePayload, settings?: UserSettingsUpdatePayload }.
 */
export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as SettingsSavePayload
  const current = await getSettingsSnapshot(session.user.id)
  const result = await saveSettingsOrchestrated({
    userId: session.user.id,
    existingPreferenceFallback: {
      preferredLanguage: current?.profile.preferredLanguage ?? null,
      themePreference: current?.profile.themePreference ?? null,
      timezone: current?.profile.timezone ?? null,
    },
    payload: {
      profile: body?.profile,
      settings: body?.settings,
    },
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to update settings" },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSettingsProfile, updateUserProfile } from "@/lib/user-settings"

export const dynamic = "force-dynamic"

const DEFAULT_DASHBOARD_TOGGLES = {
  waiverWireCloses: true,
  tradeActivity: true,
  leagueChatMessages: true,
  draftReminders: true,
  injuryAlerts: true,
} as const

/**
 * PUT /api/user/notifications
 * Merges `dashboardToggles` into `UserProfile.notificationPreferences` JSON.
 */
export async function PUT(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    dashboardToggles?: Partial<Record<keyof typeof DEFAULT_DASHBOARD_TOGGLES, boolean>>
  }

  const current = await getSettingsProfile(session.user.id)
  const prev = (current?.notificationPreferences as Record<string, unknown>) ?? {}
  const prevToggles =
    (prev.dashboardToggles as Record<string, boolean> | undefined) ?? {}

  const nextToggles = {
    ...DEFAULT_DASHBOARD_TOGGLES,
    ...prevToggles,
    ...(body.dashboardToggles && typeof body.dashboardToggles === "object"
      ? body.dashboardToggles
      : {}),
  }

  const merged: Record<string, unknown> = {
    ...prev,
    dashboardToggles: nextToggles,
  }

  const result = await updateUserProfile(session.user.id, {
    notificationPreferences: merged,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to save notifications" },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, dashboardToggles: nextToggles })
}

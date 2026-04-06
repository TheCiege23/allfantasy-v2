import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
 * GET /api/user/notifications
 * Platform notification inbox (read state) + unread count.
 */
export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string }
    } | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limit = Math.min(
      100,
      Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 40)
    )

    const userId = session.user.id

    const [items, unreadCount] = await Promise.all([
      prisma.platformNotification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.platformNotification.count({
        where: { userId, readAt: null },
      }),
    ])

    const notifications = items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      product: n.productType,
      severity: n.severity,
      read: n.readAt != null,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
      meta: (n.meta as Record<string, unknown> | null) ?? undefined,
    }))

    return NextResponse.json({ notifications, unreadCount })
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err))
    console.error("[notifications GET]", e.message, e.stack)
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 })
  }
}

/**
 * PATCH /api/user/notifications
 * Body: `{ ids: 'all' | string[] }` — marks platform notifications read for the current user.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string }
    } | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as { ids?: unknown }
    const { ids } = body
    const userId = session.user.id
    const now = new Date()

    if (ids === "all") {
      await prisma.platformNotification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: now },
      })
    } else if (Array.isArray(ids)) {
      const idList = ids.map(String).filter(Boolean)
      if (idList.length === 0) {
        return NextResponse.json({ error: "ids array required" }, { status: 400 })
      }
      await prisma.platformNotification.updateMany({
        where: { id: { in: idList }, userId },
        data: { readAt: now },
      })
    } else {
      return NextResponse.json({ error: "ids must be 'all' or an array of ids" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err))
    console.error("[notifications PATCH]", e.message, e.stack)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

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

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { savePushSubscription } from "@/lib/push-notifications"
import type { PushSubscriptionInput } from "@/lib/push-notifications/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/push/subscribe
 * Register a web push subscription for the current user.
 * Body: { endpoint, keys: { p256dh, auth }, userAgent? }
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const endpoint = typeof (body as any)?.endpoint === "string" ? (body as any).endpoint : null
  const keys = (body as any)?.keys
  const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh : null
  const auth = typeof keys?.auth === "string" ? keys.auth : null
  const userAgent = typeof (body as any)?.userAgent === "string" ? (body as any).userAgent : undefined

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Missing endpoint or keys.p256dh or keys.auth" },
      { status: 400 }
    )
  }

  const input: PushSubscriptionInput = {
    endpoint,
    keys: { p256dh, auth },
    userAgent,
  }

  try {
    const record = await savePushSubscription(userId, input)
    if (!record) {
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: record.id })
  } catch (e) {
    console.error("[push/subscribe] error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to subscribe" },
      { status: 500 }
    )
  }
}

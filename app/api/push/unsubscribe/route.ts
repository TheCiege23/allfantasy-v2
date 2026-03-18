import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { removePushSubscription } from "@/lib/push-notifications"

export const dynamic = "force-dynamic"

/**
 * POST /api/push/unsubscribe
 * Remove a web push subscription by endpoint.
 * Body: { endpoint }
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
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })
  }

  try {
    await removePushSubscription(userId, endpoint)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[push/unsubscribe] error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to unsubscribe" },
      { status: 500 }
    )
  }
}

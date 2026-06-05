import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isKnownMetaEventName, normalizeMetaCustomData } from "@/lib/meta-events"
import { trackMetaServerEvent } from "@/lib/meta-capi"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const eventName = getString(body?.event_name) ?? getString(body?.eventName)
  const eventId = getString(body?.event_id) ?? getString(body?.eventId)

  if (!eventName || !eventId) {
    return NextResponse.json(
      { ok: false, error: "Missing event_name or event_id" },
      { status: 400 }
    )
  }

  if (!isKnownMetaEventName(eventName)) {
    return NextResponse.json({ ok: false, error: "Unsupported Meta event" }, { status: 400 })
  }

  const session = (await getServerSession(authOptions as any).catch(() => null)) as {
    user?: { id?: string | null; email?: string | null }
  } | null

  const result = await trackMetaServerEvent({
    eventName,
    eventId,
    customData: normalizeMetaCustomData(
      (body?.custom_data ?? body?.customData) as Record<string, unknown> | null,
      { eventName }
    ),
    email: session?.user?.email ?? null,
    userId: session?.user?.id ?? null,
    fbp: getString(body?.fbp) ?? undefined,
    fbc: getString(body?.fbc) ?? undefined,
    eventSourceUrl: getString(body?.source_url) ?? getString(body?.sourceUrl),
    request: req,
    source: "browser_mirror",
  })

  return NextResponse.json({
    ok: true,
    eventName,
    eventId,
    capiSuccess: result.capi.success,
    error: result.capi.error ?? null,
    meta: result.capi.meta ?? null,
  })
}

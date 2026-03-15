import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { createMessageReport, isValidReason } from "@/lib/moderation"

export async function POST(req: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const messageId = String(body?.messageId ?? "").trim()
  const threadId = String(body?.threadId ?? "").trim()
  const reason = String(body?.reason ?? "").trim()

  if (!messageId || !threadId) {
    return NextResponse.json({ error: "messageId and threadId required" }, { status: 400 })
  }
  if (!reason) {
    return NextResponse.json({ error: "reason required" }, { status: 400 })
  }
  if (!isValidReason(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 })
  }

  const created = await createMessageReport(user.appUserId, messageId, threadId, reason)
  if (!created) return NextResponse.json({ error: "Could not submit report" }, { status: 400 })

  return NextResponse.json({ status: "ok", reportId: created.id })
}

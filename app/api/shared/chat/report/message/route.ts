import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { submitMessageReportForUser } from "@/lib/moderation"

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
  const result = await submitMessageReportForUser({
    reporterUserId: user.appUserId,
    messageId,
    threadId,
    reason,
  })
  if (!result.ok) return NextResponse.json({ error: result.error || "Could not submit report" }, { status: 400 })

  return NextResponse.json({ status: "ok", reportId: result.reportId })
}

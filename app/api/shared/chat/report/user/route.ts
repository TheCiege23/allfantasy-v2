import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { createUserReport, isValidReason } from "@/lib/moderation"

export async function POST(req: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const reportedUserId = String(body?.reportedUserId ?? "").trim()
  const reason = String(body?.reason ?? "").trim()

  if (!reportedUserId) {
    return NextResponse.json({ error: "reportedUserId required" }, { status: 400 })
  }
  if (!reason) {
    return NextResponse.json({ error: "reason required" }, { status: 400 })
  }
  if (!isValidReason(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 })
  }
  if (reportedUserId === user.appUserId) {
    return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 })
  }

  const created = await createUserReport(user.appUserId, reportedUserId, reason)
  if (!created) return NextResponse.json({ error: "Could not submit report" }, { status: 400 })

  return NextResponse.json({ status: "ok", reportId: created.id })
}

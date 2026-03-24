import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { submitUserReportForUser } from "@/lib/moderation"

export async function POST(req: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const reportedUserId = String(body?.reportedUserId ?? "").trim()
  const reason = String(body?.reason ?? "").trim()

  const result = await submitUserReportForUser({
    reporterUserId: user.appUserId,
    reportedUserId,
    reason,
  })
  if (!result.ok) return NextResponse.json({ error: result.error || "Could not submit report" }, { status: 400 })

  return NextResponse.json({ status: "ok", reportId: result.reportId })
}

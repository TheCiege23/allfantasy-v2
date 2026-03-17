import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { updateMessageReportStatus, getMessageReportById } from "@/lib/moderation"
import { REPORT_STATUSES } from "@/lib/moderation/ModerationQueueService"
import type { ReportStatus } from "@/lib/moderation/ModerationQueueService"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const reportId = params.reportId
  if (!reportId) return NextResponse.json({ error: "reportId required" }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const status = (body.status as string)?.trim()
  if (!status || !REPORT_STATUSES.includes(status as ReportStatus)) {
    return NextResponse.json(
      { error: "status must be one of: " + REPORT_STATUSES.join(", ") },
      { status: 400 }
    )
  }
  const existing = await getMessageReportById(reportId)
  if (!existing) return NextResponse.json({ error: "Report not found" }, { status: 404 })
  const ok = await updateMessageReportStatus(reportId, status as ReportStatus)
  if (!ok) return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  return NextResponse.json({ ok: true, status })
}

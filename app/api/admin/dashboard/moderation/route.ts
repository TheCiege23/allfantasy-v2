import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getReportedContent, getReportedUserRecords, getBlockedUsers } from "@/lib/admin-dashboard"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50))
  try {
    const [reportedContent, reportedUsers, blockedUsers] = await Promise.all([
      getReportedContent(limit),
      getReportedUserRecords(limit),
      getBlockedUsers(limit),
    ])
    return NextResponse.json({
      reportedContent,
      reportedUsers,
      blockedUsers,
    })
  } catch (e) {
    console.error("[admin/dashboard/moderation]", e)
    return NextResponse.json({ error: "Failed to load moderation data" }, { status: 500 })
  }
}

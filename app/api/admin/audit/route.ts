import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getAdminAuditLogs } from "@/lib/admin-audit"

export const dynamic = "force-dynamic"

/**
 * GET: List recent admin audit log entries (admin only).
 * Query: limit (default 100, max 500), since (ISO date).
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const { searchParams } = new URL(req.url)
  const limitParam = searchParams.get("limit")
  const limit = Math.min(
    Math.max(parseInt(limitParam ?? "100", 10) || 100, 1),
    500
  )
  const sinceParam = searchParams.get("since")
  const since = sinceParam ? new Date(sinceParam) : undefined
  if (sinceParam && Number.isNaN(since!.getTime())) {
    return NextResponse.json({ error: "Invalid since date" }, { status: 400 })
  }

  try {
    const entries = await getAdminAuditLogs({ limit, since })
    return NextResponse.json({ data: entries })
  } catch (e) {
    console.error("[admin/audit]", e)
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 })
  }
}

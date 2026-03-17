import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import {
  getNewestUsers,
  getMostActiveUsers,
  getReportedUserSummaries,
} from "@/lib/admin-dashboard"

export const dynamic = "force-dynamic"

type UserListKind = "newest" | "active" | "reported"

export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const kind = (req.nextUrl.searchParams.get("kind") || "newest") as UserListKind
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50))
  try {
    if (kind === "active") {
      const list = await getMostActiveUsers(limit)
      return NextResponse.json({ kind: "active", data: list })
    }
    if (kind === "reported") {
      const list = await getReportedUserSummaries(limit)
      return NextResponse.json({ kind: "reported", data: list })
    }
    const list = await getNewestUsers(limit)
    return NextResponse.json({ kind: "newest", data: list })
  } catch (e) {
    console.error("[admin/dashboard/users]", e)
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 })
  }
}

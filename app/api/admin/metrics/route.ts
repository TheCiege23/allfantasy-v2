import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getAdminCommandCenterMetrics } from "@/lib/admin-dashboard/AdminCommandCenterService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const url = new URL(request.url)
  const q = url.searchParams.get("q") ?? ""
  const metrics = await getAdminCommandCenterMetrics(q)
  return NextResponse.json(metrics)
}

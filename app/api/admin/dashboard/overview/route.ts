import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getPlatformOverview } from "@/lib/admin-dashboard"

export const dynamic = "force-dynamic"

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  try {
    const metrics = await getPlatformOverview()
    return NextResponse.json(metrics)
  } catch (e) {
    console.error("[admin/dashboard/overview]", e)
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 })
  }
}

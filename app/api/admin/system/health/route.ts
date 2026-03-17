import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getSystemHealth } from "@/lib/admin-dashboard"

export const dynamic = "force-dynamic"

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  try {
    const health = await getSystemHealth()
    return NextResponse.json(health)
  } catch (e) {
    console.error("[admin/system/health]", e)
    return NextResponse.json(
      { api: {}, database: "down" as const },
      { status: 500 }
    )
  }
}

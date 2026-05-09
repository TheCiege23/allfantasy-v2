import { NextResponse } from "next/server"

import { requireAdminOrBearer } from "@/lib/adminAuth"
import { getAutomationHealthSummary } from "@/lib/automation/health"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/automation/health
 * Protected via `requireAdminOrBearer` (admin cookie, bearer token, or cron-style secret).
 *
 * TODO: If you add machine-to-machine auth for Inngest/cron, narrow this route or split public metrics vs sensitive diagnostics.
 */
export async function GET(request: Request) {
  const gate = await requireAdminOrBearer(request)
  if (!gate.ok) return gate.res

  try {
    const summary = await getAutomationHealthSummary()
    return NextResponse.json(summary)
  } catch (error) {
    console.error("[api/admin/automation/health]", error)
    return NextResponse.json(
      { error: "Failed to load automation health" },
      { status: 500 }
    )
  }
}

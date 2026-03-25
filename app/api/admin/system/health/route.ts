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
      {
        api: {},
        database: "down" as const,
        workerQueue: {
          status: "down" as const,
          queued: 0,
          running: 0,
          failedLast24h: 0,
          lastCheck: new Date().toISOString(),
        },
        sportsAlerts: {
          windowHours: 24,
          totalAlerts: 0,
          sampledAlerts: 0,
          p50Ms: null,
          p95Ms: null,
          p99Ms: null,
          maxMs: null,
          lastAlertAt: null,
          byType: [
            { alertType: "injury_alert", totalAlerts: 0, sampledAlerts: 0, p50Ms: null, p95Ms: null, maxMs: null },
            { alertType: "performance_alert", totalAlerts: 0, sampledAlerts: 0, p50Ms: null, p95Ms: null, maxMs: null },
            { alertType: "lineup_alert", totalAlerts: 0, sampledAlerts: 0, p50Ms: null, p95Ms: null, maxMs: null },
          ],
        },
      },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getLatestSystemHealth, runSystemHealthMonitor } from '@/lib/agents/workers/api-health-monitor'

export const dynamic = "force-dynamic"

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  try {
    const health = (await getLatestSystemHealth()) ?? (await runSystemHealthMonitor({ runImports: false, notifyAdmins: false }))
    return NextResponse.json(health)
  } catch (e) {
    console.error("[admin/system/health]", e)
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        overall: 'down',
        providers: {},
        dataFreshness: {},
        importCompleteness: {
          leagues: {
            synced: 0,
            stale: 0,
            total: 0,
          },
        },
        alertHistory: [],
        recoveryActions: [],
      },
      { status: 500 }
    )
  }
}

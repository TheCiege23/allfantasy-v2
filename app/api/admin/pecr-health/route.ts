import { NextResponse } from "next/server"

import { withApiUsage } from "@/lib/telemetry/usage"
import { requireAdmin } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"

type PECRHealthRow = {
  feature: string
  avgIterations: number
  passRate: number
  lastRun: string | null
}

export const dynamic = "force-dynamic"

export const GET = withApiUsage({ endpoint: "/api/admin/pecr-health", tool: "AdminPECRHealth" })(async () => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const logs = await prisma.pecrLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        feature: true,
        iterations: true,
        passed: true,
        createdAt: true,
      },
    })

    const grouped = new Map<string, { count: number; iterations: number; passed: number; lastRun: Date | null }>()

    for (const log of logs) {
      const current = grouped.get(log.feature) ?? {
        count: 0,
        iterations: 0,
        passed: 0,
        lastRun: null,
      }

      current.count += 1
      current.iterations += log.iterations
      current.passed += log.passed ? 1 : 0
      current.lastRun = current.lastRun ?? log.createdAt
      grouped.set(log.feature, current)
    }

    const features: PECRHealthRow[] = [...grouped.entries()]
      .map(([feature, stats]) => ({
        feature,
        avgIterations: stats.count > 0 ? Number((stats.iterations / stats.count).toFixed(2)) : 0,
        passRate: stats.count > 0 ? Number(((stats.passed / stats.count) * 100).toFixed(1)) : 0,
        lastRun: stats.lastRun?.toISOString() ?? null,
      }))
      .sort((left, right) => left.feature.localeCompare(right.feature))

    return NextResponse.json({
      ok: true,
      totalRuns: logs.length,
      features,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[AdminPECRHealth] Error:", error)
    return NextResponse.json({ ok: false, error: "Failed to load PECR health." }, { status: 500 })
  }
})

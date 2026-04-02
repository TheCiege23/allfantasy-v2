import { NextResponse } from "next/server"

import { withApiUsage } from "@/lib/telemetry/usage"
import { requireAdmin } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const GET = withApiUsage({ endpoint: "/api/admin/ai-behavior", tool: "AdminAIBehavior" })(
  async () => {
    const gate = await requireAdmin()
    if (!gate.ok) return gate.res

    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const violations = await prisma.aIRuleViolationLog.groupBy({
        by: ["ruleId", "severity"],
        _count: { id: true },
        where: { createdAt: { gte: since } },
        orderBy: {
          ruleId: "asc",
        },
      })

      const customRuleCount = await prisma.aICustomRule.count({
        where: { enabled: true },
      })

      const byRule = new Map<string, number>()
      let hardCount = 0
      let softCount = 0

      for (const violation of violations) {
        const count = violation._count.id
        byRule.set(violation.ruleId, (byRule.get(violation.ruleId) ?? 0) + count)
        if (violation.severity === "hard") hardCount += count
        else softCount += count
      }

      const countsByRule = [...byRule.entries()]
        .map(([ruleId, count]) => ({ ruleId, count }))
        .sort((left, right) => right.count - left.count)

      return NextResponse.json({
        ok: true,
        windowDays: 7,
        totalViolations: hardCount + softCount,
        hardCount,
        softCount,
        topRule: countsByRule[0] ?? null,
        customRuleCount,
        countsByRule,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("[AdminAIBehavior] Error:", error)
      return NextResponse.json(
        { ok: false, error: "Failed to load AI behavior stats." },
        { status: 500 }
      )
    }
  }
)

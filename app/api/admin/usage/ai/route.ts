import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/** Tool or endpoint substrings that identify AI-related usage. */
const AI_TOOL_PATTERNS = [
  "AI", "Chimmy", "Orchestrat", "WaiverAI", "AIADP", "DynastyIntelligence",
  "GlobalFantasy", "PlayerComparison", "PlayerTrend", "Simulation", "AICoach",
  "MetaAnalysis", "AIAdp", "Waiver",
]
const AI_ENDPOINT_PATTERNS = [
  "/ai/", "chimmy", "waiver-ai", "orchestrate", "ai-adp", "dynasty-intelligence",
  "global-fantasy-intelligence", "player-comparison", "player-trend",
  "simulation/matchup", "coach/", "meta-analysis", "draft/ai-pick",
  "trade/ai-decision",
]

function matchesAi(tool: string | null, endpoint: string | null): boolean {
  const t = (tool ?? "").toLowerCase()
  const e = (endpoint ?? "").toLowerCase()
  for (const p of AI_TOOL_PATTERNS) {
    if (t.includes(p.toLowerCase())) return true
  }
  for (const p of AI_ENDPOINT_PATTERNS) {
    if (e.includes(p.toLowerCase())) return true
  }
  return false
}

/**
 * GET: Usage summary filtered to AI-related tools/endpoints (admin only).
 * Query: bucketType (default day), days (default 7), topN (default 20).
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const { searchParams } = new URL(req.url)
  const bucketType = (searchParams.get("bucketType") ?? "day") as "hour" | "day" | "week" | "month"
  const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "7", 10) || 7, 1), 90)
  const topN = Math.min(Math.max(parseInt(searchParams.get("topN") ?? "20", 10) || 20, 1), 100)

  const since = new Date(Date.now() - days * 24 * 3600 * 1000)

  try {
    const rows = await prisma.apiUsageRollup.findMany({
      where: {
        bucketType,
        bucketStart: { gte: since },
      },
      select: {
        tool: true,
        endpoint: true,
        count: true,
        okCount: true,
        errCount: true,
        avgMs: true,
        p95Ms: true,
      },
    })

    const filtered = rows.filter((r) => matchesAi(r.tool, r.endpoint))

    const byTool = new Map<string, { count: number; err: number; p95: number | null }>()
    for (const r of filtered) {
      const key = r.tool && r.tool !== "" ? r.tool : r.endpoint || "(unknown)"
      const cur = byTool.get(key) ?? { count: 0, err: 0, p95: null as number | null }
      cur.count += r.count ?? 0
      cur.err += r.errCount ?? 0
      cur.p95 = Math.max(cur.p95 ?? 0, Number(r.p95Ms ?? 0)) || cur.p95
      byTool.set(key, cur)
    }

    const topTools = [...byTool.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN)

    const totals = filtered.reduce(
      (acc, r) => {
        acc.count += r.count ?? 0
        acc.ok += r.okCount ?? 0
        acc.err += r.errCount ?? 0
        return acc
      },
      { count: 0, ok: 0, err: 0 }
    )

    return NextResponse.json({
      bucketType,
      days,
      since: since.toISOString(),
      totals,
      topTools,
    })
  } catch (e) {
    console.error("[admin/usage/ai]", e)
    return NextResponse.json({ error: "Failed to load AI usage" }, { status: 500 })
  }
}

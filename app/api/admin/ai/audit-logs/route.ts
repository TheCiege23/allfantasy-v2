/**
 * Admin — AI Audit Logs
 * GET /api/admin/ai/audit-logs
 *
 * Query the AiInteractionLog table with optional filters.
 * Admin-only endpoint.
 *
 * Query params:
 *   sport     — filter by sport key (e.g. "world_cup")
 *   result    — "blocked" | "warned" | "clean" | "deterministic" | "unavailable"
 *   since     — ISO timestamp (default: 24h ago)
 *   limit     — number of rows (default: 100, max: 500)
 */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const url = new URL(request.url)
  const sport = url.searchParams.get("sport") ?? null
  const result = url.searchParams.get("result") ?? null
  const sinceParam = url.searchParams.get("since") ?? null
  const limitParam = url.searchParams.get("limit") ?? null
  const llmOnly = url.searchParams.get("llmOnly") === "1"
  const providerUnavailable = url.searchParams.get("providerUnavailable") === "1"

  const since = sinceParam
    ? new Date(sinceParam)
    : new Date(Date.now() - 24 * 60 * 60 * 1000)

  const limit = Math.min(500, Math.max(1, parseInt(limitParam ?? "100", 10) || 100))

  const where: Record<string, unknown> = {
    createdAt: { gte: since },
  }
  if (sport) where.sport = sport
  if (result) where.validatorResult = result
  if (llmOnly) where.wasDeterministic = false
  if (providerUnavailable) where.providerSource = "unavailable"

  const [rows, totalCount, blockedCount] = await Promise.all([
    prisma.aiInteractionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        sport: true,
        feature: true,
        route: true,
        plan: true,
        providerSource: true,
        freshnessTier: true,
        validatorResult: true,
        blockedReason: true,
        modelUsed: true,
        tokenCost: true,
        wasDeterministic: true,
        // omit userId (PII) and missingData/allowedClaims (verbose)
      },
    }),
    prisma.aiInteractionLog.count({ where }),
    prisma.aiInteractionLog.count({ where: { ...where, validatorResult: "blocked" } }),
  ])

  return NextResponse.json({
    since: since.toISOString(),
    totalCount,
    blockedCount,
    returnedCount: rows.length,
    rows,
  })
}

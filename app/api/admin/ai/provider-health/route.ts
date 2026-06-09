/**
 * Admin — AI Provider Health
 * GET /api/admin/ai/provider-health
 *
 * Returns:
 *   - AI interaction health stats from AiInteractionLog (last 24h by default)
 *   - World Cup provider ops status (API-Football config, live chain, data counts)
 *
 * Admin-only endpoint.
 *
 * Query params:
 *   hours — window in hours (default: 24, max: 168)
 */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import {
  getAdminAiInteractionHealth,
} from "@/lib/admin-dashboard/AdminProviderHealthService"
import { getWorldCupOperationsReadiness } from "@/lib/world-cup/worldCupOperationsReadiness"
import { getWorldCupLiveProviderChain } from "@/lib/world-cup/live-providers/worldCupLiveProviderRegistry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const url = new URL(request.url)
  const hoursParam = url.searchParams.get("hours") ?? null
  const hours = Math.min(168, Math.max(1, parseInt(hoursParam ?? "24", 10) || 24))

  const [aiHealth, wcOps] = await Promise.all([
    getAdminAiInteractionHealth(hours),
    getWorldCupOperationsReadiness({}),
  ])

  const liveChain = getWorldCupLiveProviderChain()

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    windowHours: hours,
    ai: aiHealth,
    worldCup: {
      provider: wcOps.provider,
      data: wcOps.data,
      liveChain,
    },
  })
}

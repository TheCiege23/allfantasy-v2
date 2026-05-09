import { NextResponse } from "next/server"
import { z } from "zod"
import {
  getWorldCupAdminState,
  requireWorldCupApiUser,
} from "@/app/api/brackets/world-cup/_utils"
import { syncWorldCupLiveScoresWithProviderChain } from "@/lib/world-cup/worldCupLiveScoreSyncService"
import type { WorldCupLiveProviderId } from "@/lib/world-cup/live-providers/worldCupLiveProviderTypes"
import { WORLD_CUP_LIVE_PROVIDER_DEFAULT_CHAIN } from "@/lib/world-cup/live-providers/worldCupLiveProviderTypes"

export const runtime = "nodejs"

const providerIdSchema = z.enum([
  "api_sports",
  "thesportsdb",
  "reality_sports",
  "clear_sports",
  "manual",
])

const bodySchema = z.object({
  challengeId: z.string().min(1),
  dryRun: z.boolean().optional().default(false),
  recalculate: z.boolean().optional().default(true),
  seasonYear: z.number().int().min(2022).max(2030).optional().default(2026),
  providerChain: z.array(providerIdSchema).optional(),
})

export async function POST(request: Request) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const isAdmin = await getWorldCupAdminState(request, auth.user)
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const chain =
    parsed.data.providerChain && parsed.data.providerChain.length > 0
      ? (parsed.data.providerChain as WorldCupLiveProviderId[])
      : (WORLD_CUP_LIVE_PROVIDER_DEFAULT_CHAIN as WorldCupLiveProviderId[])

  const result = await syncWorldCupLiveScoresWithProviderChain({
    challengeId: parsed.data.challengeId,
    dryRun: parsed.data.dryRun,
    recalculate: parsed.data.recalculate,
    seasonYear: parsed.data.seasonYear,
    chain,
  })

  return NextResponse.json({
    ok: true,
    challengeId: parsed.data.challengeId,
    winningProvider: result.winningProvider,
    providersAttempted: result.providersAttempted,
    updated: result.updated,
    skipped: result.skipped,
    finalMatches: result.finalMatches,
    recalculated: result.recalculated,
    warnings: result.warnings,
    chainWarnings: result.chainWarnings,
    syncedAt: new Date().toISOString(),
  })
}

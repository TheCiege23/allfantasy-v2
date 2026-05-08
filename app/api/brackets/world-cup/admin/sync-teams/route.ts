import { NextResponse } from "next/server"
import { z } from "zod"
import { syncWorldCupTeams } from "@/lib/world-cup/worldCupDataSyncService"
import {
  requireWorldCupApiUser,
  getWorldCupAdminState,
} from "../../_utils"

export const runtime = "nodejs"

const schema = z.object({
  provider: z
    .enum(["mock", "apifootball", "sportsdata", "manual"])
    .optional()
    .default("mock"),
  dryRun: z.boolean().optional().default(false),
  seasonYear: z.number().int().min(2022).max(2030).optional().default(2026),
})

export async function POST(request: Request) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const isAdmin = await getWorldCupAdminState(request, auth.user)
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { provider, dryRun, seasonYear } = parsed.data

  const result = await syncWorldCupTeams({ provider, dryRun, seasonYear })

  return NextResponse.json({
    ok: true,
    dryRun,
    provider,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    warnings: result.warnings,
    teamCount: result.teams.length,
    syncedAt: new Date().toISOString(),
  })
}

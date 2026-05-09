import { NextResponse } from "next/server"
import { z } from "zod"
import { importWorldCupReadinessData } from "@/lib/world-cup/worldCupImportService"
import {
  getWorldCupAdminState,
  requireWorldCupApiUser,
} from "@/app/api/brackets/world-cup/_utils"

export const runtime = "nodejs"

const bodySchema = z.object({
  provider: z.enum(["mock", "apifootball", "sportsdata", "manual"]).optional().default("mock"),
  dryRun: z.boolean().optional().default(false),
  seasonYear: z.number().int().min(2022).max(2030).optional().default(2026),
  challengeId: z.string().min(1).nullable().optional(),
  mode: z.enum(["teams", "fixtures", "all"]).optional().default("all"),
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

  const result = await importWorldCupReadinessData(parsed.data)
  return NextResponse.json({
    ...result,
    teamCount: result.teams?.teams.length ?? 0,
    fixtureCount: result.fixtures?.fixtures.length ?? 0,
    warnings: [
      ...(result.teams?.warnings ?? []),
      ...(result.fixtures?.warnings ?? []),
    ],
    importedAt: new Date().toISOString(),
  })
}

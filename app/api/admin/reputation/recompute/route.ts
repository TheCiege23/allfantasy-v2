import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminOrBearer } from "@/lib/adminAuth"
import { runReputationEngineForLeague } from "@/lib/reputation-engine"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const recomputeSchema = z.object({
  leagueId: z.string().min(1),
  sport: z.string().optional(),
  season: z.coerce.number().int().optional(),
  replace: z.boolean().optional().default(true),
})

export async function POST(request: Request) {
  const gate = await requireAdminOrBearer(request)
  if (!gate.ok) return gate.res

  const body = await request.json().catch(() => ({}))
  const parsed = recomputeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }

  const { leagueId, sport, season, replace } = parsed.data

  try {
    const result = await runReputationEngineForLeague(leagueId, { sport, season, replace })
    return NextResponse.json({
      ok: true,
      leagueId,
      ...result,
      recomputedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : String(error)
    console.error("[admin/reputation/recompute] error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

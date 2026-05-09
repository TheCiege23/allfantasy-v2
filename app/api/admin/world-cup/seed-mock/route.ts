import { NextResponse } from "next/server"
import { z } from "zod"
import { loadWorldCupTestFixtures } from "@/lib/world-cup/worldCupSimulationService"
import {
  assertWorldCupManager,
  requireWorldCupApiUser,
} from "@/app/api/brackets/world-cup/_utils"

export const runtime = "nodejs"

const bodySchema = z.object({
  challengeId: z.string().min(1),
  confirmTestFixtures: z.literal(true),
  dryRun: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const access = await assertWorldCupManager(request, parsed.data.challengeId, auth.user)
  if (!access.ok) return access.response

  const result = await loadWorldCupTestFixtures(parsed.data.challengeId, {
    dryRun: parsed.data.dryRun,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.warnings[0] ?? "Failed to seed mock fixtures" }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    dryRun: parsed.data.dryRun,
    result,
    seededAt: new Date().toISOString(),
  })
}

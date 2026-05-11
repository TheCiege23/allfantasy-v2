import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { getUserAfProStatus, AfProRequiredError } from "@/lib/entitlements/afAccess"
import { generateWaiverRecommendations } from "@/lib/ai/waivers/waiverRecommendationService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  leagueId: z.string().min(1),
  mode: z.enum(["quick", "deep"]).default("quick"),
  includeFaab: z.boolean().optional(),
  week: z.number().int().positive().optional(),
})

/**
 * POST /api/ai/waivers/recommend
 *
 * Returns personalized AI waiver recommendations for an AF Pro user.
 * - Requires authenticated session.
 * - Requires AF Pro entitlement (pro_waiver_ai).
 * - Never posts to league chat.
 * - Never submits waiver claims automatically.
 * - deeperAnalysisPath on each recommendation routes to Chimmy AI chat.
 */
export async function POST(request: Request) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // AF Pro gate
  const hasAfPro = await getUserAfProStatus(userId)
  if (!hasAfPro) {
    return NextResponse.json(new AfProRequiredError().toResponse(), { status: 402 })
  }

  const json = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { leagueId, mode, includeFaab, week } = parsed.data

  try {
    const output = await generateWaiverRecommendations({
      userId,
      leagueId,
      mode,
      includeFaab,
      week,
    })

    return NextResponse.json({
      ok: true,
      ...output,
    })
  } catch (error) {
    console.error("[api/ai/waivers/recommend]", error)
    return NextResponse.json(
      { error: "Failed to generate waiver recommendations" },
      { status: 500 }
    )
  }
}

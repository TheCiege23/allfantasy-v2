import { NextRequest, NextResponse } from "next/server"
import { userHasBracketBrainAi } from "@/lib/bracket-brain/bracketBrainAccess"
import { generateWorldCupBracketExplanation } from "@/lib/world-cup/worldCupExplainBracketService"
import { requireWorldCupApiUser } from "../../../../_utils"

export const runtime = "nodejs"

export async function POST(
  _req: NextRequest,
  { params }: { params: { challengeId: string; entryId: string } }
) {
  const userResult = await requireWorldCupApiUser()
  if (!userResult.ok) return userResult.response

  const { challengeId, entryId } = params
  if (!challengeId || !entryId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // AF Pro gate — return 402 with upgrade flag (consistent with commissioner-brain).
  const hasBracketBrainAi = await userHasBracketBrainAi(
    userResult.user.id,
    userResult.user.email ?? null
  )
  if (!hasBracketBrainAi) {
    return NextResponse.json(
      {
        error: "AF Pro required for the private bracket explanation.",
        upgrade: true,
        hasBracketBrainAi: false,
      },
      { status: 402 }
    )
  }

  const result = await generateWorldCupBracketExplanation({
    challengeId,
    entryId,
    userId: userResult.user.id,
  })

  if (!result.ok) {
    if (result.reason === "entry_not_found") {
      // Mirrors matchup AI route: non-owner is silently 404.
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }
    return NextResponse.json(
      { error: "Could not generate explanation. Please try again." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    summary: result.summary,
    lines: result.lines,
    generative: result.generative,
  })
}

import { NextResponse } from "next/server"
import { z } from "zod"
import { createPlayoffBracketChallenge } from "@/lib/playoffs/playoffService"
import { requireWorldCupApiUser } from "./_utils"

export const runtime = "nodejs"

const createPlayoffChallengeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  sport: z.enum(["nba", "nhl"]),
  seasonYear: z.coerce.number().int().min(2024).max(2100).optional(),
  isTestMode: z.boolean().optional(),
})

export async function POST(request: Request) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const parsed = createPlayoffChallengeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await createPlayoffBracketChallenge({
      user: auth.user,
      name: parsed.data.name,
      sport: parsed.data.sport,
      seasonYear: parsed.data.seasonYear,
      isTestMode: parsed.data.isTestMode,
    })

    return NextResponse.json({
      ok: true,
      challengeId: result.challengeId,
      entryId: result.entryId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create playoff challenge",
      },
      { status: 500 }
    )
  }
}
